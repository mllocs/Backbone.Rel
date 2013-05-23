/*global it, describe, before, beforeEach*/
var _ = require('underscore')
  , assert = require('assert')
  , Models = {}
  , Collections = {}

  // instances
  , tasks, projects, users, comments;

GLOBAL.Backbone = require('backbone');
require('../backbone.rel');

Models.Task = Backbone.Model.extend({
  belongsTo: function () {
    return {
      user: users
    , project: function (task) {
        return projects.get(task.rel('user.project'));
      }
    };
  }
, hasMany: function () {
    return {
      comments: {collection: comments, id: 'task_id'}
    };
  }
});

Models.User = Backbone.Model.extend({
  hasMany: function () {
    return {
      tasks: {collection: tasks, id: 'user_id'}
    , owned_projects: {collection: projects, id: 'owner_id'}
    };
  }
, belongsTo: function () {
    return {
      project: projects
    };
  }
});

Models.Project = Backbone.Model.extend({
  hasMany: function () {
    return {
      tasks: {collection: tasks, filter: function (task) {
        return task.rel('project')
          ? task.rel('project').id === this.id
          : null;
      }}
    , users: {collection: users, id: 'project_id'}
    };
  }
, belongsTo: function () {
    return {
      owner: users
    };
  }
});

Models.Comment = Backbone.Model.extend({
  belongsTo: function () {
    return {
      task: tasks
    };
  }
});

Collections.Users = Backbone.Collection.extend({
  model: Models.User
});

Collections.Projects = Backbone.Collection.extend({
  model: Models.Project
});

Collections.Tasks = Backbone.Collection.extend({
  model: Models.Task
});

Collections.Comments = Backbone.Collection.extend({
  model: Models.Comment
});

// lengths
describe('Rel', function () {

  beforeEach(function () {
    tasks = new Collections.Tasks();
    projects = new Collections.Projects();
    users = new Collections.Users();
    comments = new Collections.Comments();

    // Adds users to a project
    for (var i = 0; i < 3; i++) {
      users.add({id: i, project_id: i % 3});
    }

    // Adds tasks to users
    for (var i = 0; i < 6; i++) {
      if (i === 0) {
        tasks.add({id: i});
      } else {
        tasks.add({id: i, user_id: i % 2});
      }
    }

    // Addes projects to owners
    for (var i = 0; i < 2; i++) {
      projects.add({id: i, owner_id: 0});
    }

    // Addes comments to tasks
    for (var i = 0; i < 12; i++) {
      comments.add({id: i, task_id: i % 3});
    }
  });

  describe('Models', function () {
    it('returns the project for a given user', function () {
      assert.equal(users.get(0).rel('project'), projects.get(0));
      assert.equal(users.get(1).rel('project'), projects.get(1));
      assert.deepEqual(users.get(2).rel('project'), null);
    });

    it('returns the tasks for a given user', function () {
      assert.deepEqual(_.pluck(users.get(0).rel('tasks'), 'id'), [2, 4]);
      assert.deepEqual(_.pluck(users.get(1).rel('tasks'), 'id'), [1, 3, 5]);
      assert.deepEqual(_.pluck(users.get(2).rel('tasks'), 'id'), []);
    });

    it('returns the owned projects for a given user', function () {
      assert.deepEqual(_.pluck(users.get(0).rel('owned_projects'), 'id'), [0, 1]);
      assert.deepEqual(users.get(1).rel('owned_projects'), []);
      assert.deepEqual(users.get(2).rel('owned_projects'), []);
    });

    it('returns the user for a given task', function () {
      assert.deepEqual(tasks.get(0).rel('user'), null);
      assert.deepEqual(tasks.get(1).rel('user'), users.get(1));
      assert.deepEqual(tasks.get(2).rel('user'), users.get(0));
      assert.deepEqual(tasks.get(3).rel('user'), users.get(1));
      assert.deepEqual(tasks.get(4).rel('user'), users.get(0));
    });

    it('returns the project for a given task', function () {
      assert.throws(function () {
        assert.deepEqual(tasks.get(0).rel('project'), projects.get(0));
      });
      assert.deepEqual(tasks.get(1).rel('project'), projects.get(1));
      assert.deepEqual(tasks.get(2).rel('project'), projects.get(0));
      assert.deepEqual(tasks.get(3).rel('project'), projects.get(1));
    });

    it('returns the owner for a given project', function () {
      assert.deepEqual(projects.get(0).rel('owner'), users.get(0));
      assert.deepEqual(projects.get(1).rel('owner'), users.get(0));
    });

    it('returns the tasks for a given project', function () {
      assert.deepEqual(_.pluck(projects.get(0).rel('tasks'), 'id'), [2, 4]);
      assert.deepEqual(_.pluck(projects.get(1).rel('tasks'), 'id'), [1, 3, 5]);
    });

    it('returns the users for a given project', function () {
      assert.deepEqual(_.pluck(projects.get(0).rel('users'), 'id'), [0]);
      assert.deepEqual(_.pluck(projects.get(1).rel('users'), 'id'), [1]);
    });

    it('returns the user tasks owners for a given user', function () {
      assert.deepEqual(_.pluck(users.get(0).rel('tasks.user'), 'id'), [0, 0]);
    });

    it('returns the comments of all user tasks', function () {
      assert.deepEqual(_.pluck(users.get(0).rel('tasks.comments'), 'id'), [2, 5, 8, 11]);
    });
  });

  describe('Collections', function () {
    it('returns the `belongsTo` relationship if the key is defined', function () {
      Collections.ProjectTasks = Backbone.Collection.extend({
        model: Models.Task
      , initialize: function (models, options) {
          this.project_id = options.project_id;
        }
      , belongsTo: function () {
          return {
            project: projects
          };
        }
      });

      tasks = new Collections.ProjectTasks([{id: 100}], {project_id: 1});

      assert.deepEqual(tasks.length, 1);
      assert.deepEqual(tasks.rel('project'), projects.get(1));
    });

    it('returns null if the `belongsTo` key is not defined', function () {
      Collections.ProjectTasks = Backbone.Collection.extend({
        model: Models.Task
      , belongsTo: function () {
          return {
            project: projects
          };
        }
      });

      tasks = new Collections.ProjectTasks([{id: 100}], {project_id: 1});

      assert.deepEqual(tasks.length, 1);
      assert.deepEqual(tasks.rel('project'), null);
    });

    it('returns null if trying to access a `hasMany` relationship', function () {
      Collections.OwnerUsers = Backbone.Collection.extend({
        model: Models.Task
      , hasMany: function () {
          return {
            owned_projects: {collection: projects, id: 'owner_id'}
          };
        }
      });

      tasks = new Collections.OwnerUsers();
      assert.deepEqual(tasks.rel('owned_projects'), null);
    });
  });
});
