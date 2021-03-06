var Sprout = require('./../lib')
  , apiAdd = require('./../lib/api/add')
  , apiInit = require('./../lib/api/init')
  , apiRemove = require('./../lib/api/remove')
  , apiRun = require('./../lib/api/run')
  , Template = require('./../lib/template')
  , Utils = require('./../lib/utils')
  , CLI = require('./../lib/cli')
  , helpers = require('./../lib/helpers')
  , chai = require('chai')
  , path = require('path')
  , fs = require('fs')
  , rimraf = require('rimraf')
  , mockery = require('mockery')
  , errno = require('errno')
  , exec = require('child_process').exec
  , os = require('os')
  , Promise = require('bluebird');

var fixturesPath = path.join(__dirname, 'fixtures');

chai.should()

describe('sprout',
  function () {

    var sproutFixturesPath
      , sprout;

    before(
      function () {
        sproutFixturesPath = path.join(fixturesPath, 'sprout');
        sprout = new Sprout(path.join(sproutFixturesPath, '__sprout__'))
      }
    )

    it('should construct with a valid path',
      function (done) {
        var p = path.join(sproutFixturesPath, 'validPath');
        (function () { return new Sprout(p) })().should.be.ok
        done();
      }
    )

    it('should throw if path doesn\'t exist',
      function (done) {
        var p = 'foo/bar/foo/bar/foo/bar/doge';
        (function () { return new Sprout(p) }).should.throw(p + ' does not exist');
        done();
      }
    )

    it('should throw if path is not a directory',
      function (done) {
        var p = path.join(sproutFixturesPath, 'notDirectory.foo');
        (function () { return new Sprout(p) }).should.throw(p + ' is not a directory');
        done();
      }
    )

    it('should instantiate all directories as template objects.',
      function (done) {
        var p = path.join(sproutFixturesPath, 'templates')
          , newSprout = new Sprout(p);
        newSprout.templates['foo'].should.be.instanceof(Template);
        newSprout.templates['bar'].should.be.instanceof(Template);
        done();
      }
    )

    describe('add',
      function () {

        it('should add template',
          function (done) {
            var name = 'add'
              , src = 'https://github.com/carrot/sprout-sprout';
            sprout.add(name, src).then(
              function (sprout) {
                sprout.templates[name].should.be.instanceof(Template);
                sprout.templates[name].src.should.eq(src);
                fs.existsSync(sprout.templates[name].path).should.be.true;
                return sprout.remove(name);
              }
            ).then(
              function () {
                done();
              }
            );
          }
        )

        it('should throw if no name',
          function (done) {
            (function () { sprout.add(null, 'https://github.com/carrot/sprout-sprout') }).should.throw;
            done();
          }
        )

      }
    )

    describe('remove',
      function () {

        it('should remove template',
          function (done) {
            var name = 'remove'
              , src = 'https://github.com/carrot/sprout-sprout'
              , template;
            sprout.add(name, src).then(
              function (sprout) {
                template = sprout.templates[name];
                template.should.be.instanceof(Template);
                template.src.should.eq(src);
                fs.existsSync(template.path).should.be.true;
                return sprout.remove(name);
              }
            ).then(
              function () {
                (sprout.templates[name] === undefined).should.be.true;
                fs.existsSync(template.path).should.be.false;
                done();
              }
            );
          }
        )

        it('should throw if no name',
          function (done) {
            (function () { sprout.remove(null) }).should.throw;
            done();
          }
        )

      }
    )

    describe('init',
      function () {

        it('should init template',
          function (done) {
            var name = 'init'
              , fixture = path.join(sproutFixturesPath, name)
              , src = 'https://github.com/carrot/sprout-sprout'
              , target = path.join(fixture, 'target');
            sprout.add(name, src).then(
              function (sprout) {
                sprout.templates[name].should.be.instanceof(Template);
                sprout.templates[name].src.should.eq(src);
                fs.existsSync(sprout.templates[name].path).should.be.true;
                return sprout.init(name, target, {
                  locals: {
                    name: 'bar',
                    description: 'foo',
                    github_username: 'carrot'
                  }
                });
              }
            ).then(
              function () {
                fs.existsSync(target).should.be.true;
                return sprout.remove(name);
              }
            ).then(
              function () {
                rimraf(target, done);
              }
            )
          }
        )

        it('should throw if no name',
          function (done) {
            (function () { sprout.init(null) }).should.throw;
            done();
          }
        )

      }
    )

    describe('run',
      function () {

        it('should run generator in template',
          function (done) {
            var name = 'run'
              , fixture = path.join(sproutFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target');
            return gitInit(src).then(
              function () {
                return sprout.add(name, src);
              }
            ).then(
              function () {
                sprout.templates[name].should.be.instanceof(Template);
                sprout.templates[name].src.should.eq(src);
                fs.existsSync(sprout.templates[name].path).should.be.true;
                return sprout.init(name, target);
              }
            ).then(
              function () {
                return sprout.run(name, target, 'foo');
              }
            ).then(
              function () {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar');
                return sprout.remove(name);
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('should throw if no name',
          function (done) {
            (function () { sprout.run(null) }).should.throw;
            done();
          }
        )

      }
    )

  }
)

describe('api',
  function () {

    var apiFixturesPath
      , sprout;

    before(
      function () {
        apiFixturesPath = path.join(fixturesPath, 'api');
        sprout = new Sprout(path.join(apiFixturesPath, '__sprout__'));
      }
    )

    describe('add',
      function () {

        it('should add template',
          function (done) {
            return apiAdd(sprout, 'foo', 'https://github.com/carrot/sprout-sprout').then(
              function () {
                sprout.templates['foo'].should.be.ok;
                fs.existsSync(path.join(sprout.path, 'foo')).should.be.true;
                return apiRemove(sprout, 'foo');
              }
            ).then(
              function () {
                done();
              }
            )
          }
        )

      }
    )

    describe('remove',
      function () {

        it('should remove template',
          function (done) {
            return apiAdd(sprout, 'foo', 'https://github.com/carrot/sprout-sprout').then(
              function () {
                sprout.templates['foo'].should.be.ok;
                fs.existsSync(path.join(sprout.path, 'foo')).should.be.true;
                return apiRemove(sprout, 'foo');
              }
            ).then(
              function () {
                (sprout.templates['foo'] === undefined).should.be.true;
                fs.existsSync(path.join(sprout.path, 'foo')).should.be.false;
                done();
              }
            )
          }
        )

        it('should throw if template does not exists',
          function (done) {
            return apiRemove(sprout, 'foo').catch(
              function (error) {
                error.toString().should.eq('Error: template foo does not exist');
                done();
              }
            )
          }
        )

      }
    )

    describe('init',
      function () {

        it('should init template',
          function (done) {
            var action = 'init'
              , fixture = path.join(apiFixturesPath, action)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target');
            return gitInit(src).then(
              function () {
                return apiAdd(sprout, action, src);
              }
            ).then(
              function () {
                sprout.templates[action].should.be.ok;
                fs.existsSync(path.join(sprout.path, action)).should.be.true;
                return apiInit(sprout, action, target);
              }
            ).then(
              function () {
                fs.existsSync(target).should.be.true;
                return apiRemove(sprout, action);
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('should throw if template does not exists',
          function (done) {
            return apiInit(sprout, 'foo').catch(
              function (error) {
                error.toString().should.eq('Error: template foo does not exist');
                done();
              }
            )
          }
        )

      }
    )

    describe('run',
      function () {

        it('should run generator in template',
          function (done) {
            var action = 'run'
              , fixture = path.join(apiFixturesPath, action)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target');
            return gitInit(src).then(
              function () {
                return apiAdd(sprout, action, src);
              }
            ).then(
              function () {
                sprout.templates[action].should.be.ok;
                fs.existsSync(path.join(sprout.path, action)).should.be.true;
                return apiInit(sprout, action, target);
              }
            ).then(
              function () {
                fs.existsSync(target).should.be.true;
                return apiRun(sprout, action, target, 'foo');
              }
            ).then(
              function () {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar');
                return apiRemove(sprout, action);
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('should throw if template does not exists',
          function (done) {
            return apiRun(sprout, 'foo').catch(
              function (error) {
                error.toString().should.eq('Error: template foo does not exist');
                done();
              }
            )
          }
        )

      }
    )

  }
)

describe('template',
  function () {

    var templateFixturesPath
      , sprout;

    before(
      function () {
        templateFixturesPath = path.join(fixturesPath, 'template');
        sprout = new Sprout(path.join(templateFixturesPath, '__sprout__'));
      }
    )

    it('should construct with a valid name and path',
      function (done) {
        var name = 'validNamePath'
          , src = path.join(templateFixturesPath, name);
        (function () { return new Template(sprout, name, src) }).should.be.ok
        done();
      }
    )

    it('should throw without a valid name',
      function (done) {
        var name = null
          , src = path.join(templateFixturesPath, 'foo');
        (function () { return new Template(sprout, name, src) }).should.throw
        done();
      }
    )

    it('should determine that src is remote',
      function (done) {
        var name = 'foo'
          , src = 'https://github.com/carrot/sprout-sprout'
          , template = new Template(sprout, name, src);
        template.isRemote.should.be.true;
        done();
      }
    )

    it('should determine that src is local',
      function (done) {
        var name = 'foo'
          , src = path.join(templateFixturesPath, 'isLocal')
          , template = new Template(sprout, name, src);
        template.isRemote.should.be.false;
        done();
      }
    )

    describe('save',
      function () {

        var saveTemplateFixturesPath;

        before(
          function () {
            saveTemplateFixturesPath = path.join(templateFixturesPath, 'save')
          }
        )

        it('should save a remote template',
          function (done) {
            var name = 'remote'
              , src = 'https://github.com/carrot/sprout-sprout'
              , template = new Template(sprout, name, src);
            return template.save().then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.remove(name);
              }
            ).then(
              function () {
                done();
              }
            )
          }
        )

        it('should save a local template',
          function (done) {
            var name = 'local'
              , src = path.join(saveTemplateFixturesPath, name)
              , template = new Template(sprout, name, src);
            gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.remove(name);
              }
            ).then(
              function () {
                done();
              }
            )
          }
        )

        it('should replace existing template with same name',
          function (done) {
            var name = 'replace'
              , src = path.join(saveTemplateFixturesPath, name)
              , template = new Template(sprout, name, 'https://github.com/carrot/sprout-sprout');
            return template.save().then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return gitInit(src);
              }
            ).then(
              function () {
                return (new Template(sprout, name, src)).save();
              }
            ).then(
              function () {
                fs.existsSync(template.path).should.be.true;
                template.name.should.eq(name);
                fs.readFileSync(path.join(template.path, 'init.js'), 'utf8').should.eq('module.exports = {};\n');
                return template.remove(name)
              }
            ).then(
              function () {
                done();
              }
            )
          }
        )

        it('should throw if template has no src',
          function (done) {
            var name = 'noSrc'
              , src = null
              , template = new Template(sprout, name, src);
            return template.save().catch(
              function (error) {
                error.toString().should.eq('Error: no source provided');
                done();
              }
            )
          }
        )

        it('should throw if src is remote and there is no internet',
          function (done) {
            mockery.enable({useCleanCache: true, warnOnUnregistered: false});
            mockery.registerMock('dns', {resolve:
              function (name, callback) {
                return callback(errno.code.ECONNREFUSED);
              }
            })
            var name = 'noInternet'
              , src = 'https://github.com/carrot/sprout-sprout'
              , template = new (require('./../lib/template'))(sprout, name, src);
            return template.save().catch(
              function (error) {
                error.toString().should.eq('Error: make sure that you are connected to the internet!');
                mockery.deregisterMock('dns');
                mockery.disable();
                done();
              }
            )
          }
        )

        it('should throw if src is local and doesn\'t exist',
          function (done) {
            var name = 'noLocal'
              , src = path.join(saveTemplateFixturesPath, name)
              , template = new Template(sprout, name, src);
            return template.save().catch(
              function (error) {
                error.toString().should.eq('Error: there is no sprout template located at ' + src);
                done();
              }
            )
          }
        )

        it('should throw if src is local and isn\'t a git repo',
          function (done) {
            var name = 'noGit'
              , src = path.join(saveTemplateFixturesPath, name)
              , template = new Template(sprout, name, src);
            return template.save().catch(
              function (error) {
                error.toString().should.eq('Error: ' + src + ' is not a git repository');
                done();
              }
            )
          }
        )

        it('should throw and remove template when init.coffee and init.js don\'t exist in template',
          function (done) {
            var name = 'noInit'
              , src = path.join(saveTemplateFixturesPath, name)
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).catch(
              function (error) {
                fs.existsSync(template.path).should.be.false;
                error.toString().should.eq('Error: neither init.coffee nor init.js exist in this template');
                done();
              }
            )
          }
        )

        it('should throw and remove template when root path doesn\'t exist in template',
          function (done) {
            var name = 'noRoot'
              , src = path.join(saveTemplateFixturesPath, name)
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).catch(
              function (error) {
                fs.existsSync(template.path).should.be.false;
                error.toString().should.eq('Error: root path doesn\'t exist in template');
                done();
              }
            )
          }
        )

      }
    )

    describe('init',
      function () {

        var initTemplateFixturesPath;

        before(
          function () {
            initTemplateFixturesPath = path.join(templateFixturesPath, 'init');
          }
        )

        it('should init template',
          function (done) {
            var name = 'init'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = 'https://github.com/carrot/sprout-sprout'
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return template.save().then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target, {
                  locals: {
                    name: 'bar',
                    description: 'foo',
                    github_username: 'carrot'
                  }
                });
              }
            ).then(
              function (template) {
                fs.existsSync(target).should.be.true;
                return template.remove();
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('should throw when no root path',
          function (done) {
            var name = 'noRoot'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return Promise.promisify(rimraf)(template.root);
              }
            ).then(
              function () {
                return template.init(target);
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: root path doesn\'t exist in ' + name);
                fs.mkdirSync(template.root);
                fs.writeFileSync(path.join(template.root, '.keep'), '');
                return template.remove().then(
                  function () {
                    done();
                  }
                );
              }
            )
          }
        )

        it('should throw when no target provided',
          function (done) {
            var name = 'noRoot'
              , src = 'https://github.com/carrot/sprout-sprout'
              , target = null
              , template = new Template(sprout, name, src);
            return template.save().then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(null);
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: target path required');
                return template.remove().then(
                  function () {
                    done();
                  }
                );
              }
            )
          }
        )

        it('should throw when target is not git repository',
          function (done) {
            var name = 'noGit'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = 'https://github.com/carrot/sprout-sprout'
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return template.save().then(
              function () {
                fs.existsSync(template.path).should.be.true;
                return Promise.promisify(rimraf)(path.join(template.path, '.git'));
              }
            ).then(
              function () {
                return template.init(target);
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: ' + name + ' is not a git repository');
                return template.remove().then(
                  function () {
                    done();
                  }
                );
              }
            )
          }
        )

        it('should throw when target exists',
          function (done) {
            var name = 'targetExists'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = 'https://github.com/carrot/sprout-sprout'
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return template.save().then(
              function () {
                fs.existsSync(template.path).should.be.true;
                return template.init(target);
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: ' + target + ' already exists');
                return template.remove().then(
                  function () {
                    done();
                  }
                );
              }
            )
          }
        )

        it('should throw when no init.js or init.coffee provided',
          function (done) {
            var name = 'init'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = 'https://github.com/carrot/sprout-sprout'
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return template.save().then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                fs.unlinkSync(path.join(template.path, 'init.coffee'));
                return template.init(target);
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: neither init.coffee nor init.js exist');
                return template.remove().then(
                  function () {
                    rimraf(target, done);
                  }
                );
              }
            )
          }
        )

        it('should throw when require init throws',
          function (done) {
            var name = 'initThrows'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target);
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: Cannot find module \'doge\'');
                return template.remove().then(
                  function () {
                    rimraf(target, done);
                  }
                );
              }
            )
          }
        )

        it('should use init.js',
          function (done) {
            var name = 'initJs'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target);
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar\n');
                return template.remove();
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('should use init.coffee',
          function (done) {
            var name = 'initCoffee'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target);
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar\n');
                return template.remove();
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('should use a different git branch if specified',
          function (done) {
            var name = 'branch'
              , fixture = path.join(initTemplateFixturesPath, name)
              , sproutPath = path.join((os.tmpdir ? os.tmpdir() : os.tmpDir()), '__sprout__')
              , src = path.join((os.tmpdir ? os.tmpdir() : os.tmpDir()), name)
              , srcRoot = path.join(src, 'root')
              , srcInit = path.join(src, 'init.js')
              , target = path.join(fixture, 'target')
              , template;
            return Promise.promisify(rimraf)(sproutPath).then(
              function () {
                fs.mkdirSync(sproutPath);
                return Promise.promisify(rimraf)(src);
              }
            ).then(
              function () {
                fs.mkdirSync(src);
                fs.writeFileSync(srcInit, 'module.exports={};');
                fs.mkdirSync(srcRoot);
                fs.writeFileSync(path.join(srcRoot, '.keep'), '');
                template = new Template(new Sprout(sproutPath), name, src);
              }
            ).then(
              function () {
                return gitInit(src);
              }
            ).then(
              function () {
                return gitCommitAdd(src);
              }
            ).then(
              function () {
                return template.save();
              }
            )
            .then(
              function () {
                return gitCreateBranch(template.path, name);
              }
            ).then(
              function () {
                fs.writeFileSync(path.join(template.root, 'foo'), '', 'utf8');
                return gitCommitAdd(template.path);
              }
            ).then(
              function () {
                return gitCheckout(template.path, 'master');
              }
            ).then(
              function () {
                return template.init(target, {branch: name});
              }
            ).then(
              function () {
                fs.existsSync(path.join(target, 'foo')).should.be.true;
                return gitCurrentBranch(template.path);
              }
            ).then(
              function (branch) {
                branch.should.eq('master\n');
                return template.remove();
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            );
          }
        )

        it('should use a different git tag if specified',
          function (done) {
            var name = 'tag'
              , fixture = path.join(initTemplateFixturesPath, name)
              , sproutPath = path.join((os.tmpdir ? os.tmpdir() : os.tmpDir()), '__sprout__')
              , src = path.join((os.tmpdir ? os.tmpdir() : os.tmpDir()), name)
              , srcRoot = path.join(src, 'root')
              , srcInit = path.join(src, 'init.js')
              , target = path.join(fixture, 'target')
              , template;
            return Promise.promisify(rimraf)(sproutPath).then(
              function () {
                fs.mkdirSync(sproutPath);
                return Promise.promisify(rimraf)(src);
              }
            ).then(
              function () {
                fs.mkdirSync(src);
                fs.writeFileSync(srcInit, 'module.exports={};');
                fs.mkdirSync(srcRoot);
                fs.writeFileSync(path.join(srcRoot, '.keep'), '');
                template = new Template(new Sprout(sproutPath), name, src);
              }
            ).then(
              function () {
                return gitInit(src);
              }
            ).then(
              function () {
                return gitCommitAdd(src);
              }
            ).then(
              function () {
                return template.save();
              }
            ).then(
              function () {
                fs.writeFileSync(path.join(template.root, 'foo'), '', 'utf8');
                return gitCommitAdd(template.path);
              }
            )
            .then(
              function () {
                return gitTag(template.path, name);
              }
            ).then(
              function () {
                fs.writeFileSync(path.join(template.root, 'foo2'), '', 'utf8');
                return gitCommitAdd(template.path);
              }
            ).then(
              function () {
                return gitCheckout(template.path, 'master');
              }
            ).then(
              function () {
                return template.init(target, {tag: name});
              }
            ).then(
              function () {
                fs.existsSync(path.join(target, 'foo2')).should.be.false;
                return gitCurrentBranch(template.path);
              }
            ).then(
              function (branch) {
                branch.should.eq('master\n');
                return template.remove();
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            );
          }
        )

        it('should throw error if tag doesn\'t exist',
          function (done) {
            var name = 'tagMissing'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = 'https://github.com/carrot/sprout-sprout'
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return template.save().then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target, {tag: 'foooooooo'});
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: tag `foooooooo` does not exist');
                return template.remove().then(
                  function () {
                    return rimraf(target, done);
                  }
                );
              }
            )
          }
        )

        it('should use .json configuration file',
          function (done) {
            var name = 'jsonConfig'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target, {config: path.join(fixture, 'config.json')});
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar\n');
                return template.remove();
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('should use .yaml configuration file',
          function (done) {
            var name = 'yamlConfig'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target, {config: path.join(fixture, 'config.yaml')});
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar\n');
                return template.remove();
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('it should ignore files specified in init',
          function (done) {
            var name = 'ignore'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target);
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('<%= foo %>\n');
                return template.remove();
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('it should ignore one file specified in init',
          function (done) {
            var name = 'ignoreOne'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target);
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('<%= foo %>\n');
                return template.remove();
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('should ask questions if questionnaire is passed',
          function (done) {
            var name = 'questionnaire'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            var q = function (){
              return new Promise(
                function (resolve, reject) {
                  return resolve({foo: 'bar'});
                }
              )
            }
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target, {questionnaire: q});
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar\n');
                return template.remove();
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('should throw error if configuration file is invalid',
          function (done) {
            var name = 'invalidConfig'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , configPath = path.join(fixture, 'foobar')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target, {config: configPath});
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: could not open configuration file ' + configPath);
                return template.remove().then(
                  function () {
                    done();
                  }
                );
              }
            )
          }
        )

        it('should include underscore.string as EJS "local"',
          function (done) {
            var name = 'underscoreString'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target);
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('Bar\n');
                return template.remove();
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('should apply defaults',
          function (done) {
            var name = 'defaults'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target);
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar\n');
                return template.remove();
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('should install npm dependencies',
          function (done) {
            var name = 'npm'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target);
              }
            ).then(
              function (template) {
                fs.existsSync(path.join(template.path, 'node_modules')).should.be.true;
                return template.remove();
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('should run before hook',
          function (done) {
            var name = 'before'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target);
              }
            ).then(
              function (template) {
                fs.existsSync(path.join(target, 'bar')).should.be.true;
                return template.remove();
              }
            ).then(
              function () {
                return rimraf(target, done)
              }
            )
          }
        )

        it('should run beforeRender hook',
          function (done) {
            var name = 'beforeRender'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target);
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('foo\n');
                return template.remove();
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('should run after hook',
          function (done) {
            var name = 'after'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target);
              }
            ).then(
              function (template) {
                fs.existsSync(path.join(target, 'bar')).should.be.true;
                return template.remove();
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('should remove target directory if error thrown after target directory created',
          function (done) {
            var name = 'removeTarget'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target);
              }
            ).catch(
              function () {
                fs.existsSync(target).should.be.false;
                return template.remove().then(
                  function () {
                    done();
                  }
                )
              }
            )
          }
        )

        it('should work if internet is missing',
          function (done) {
            mockery.enable({useCleanCache: true, warnOnUnregistered: false});
            mockery.registerMock('dns', {resolve:
              function (name, callback) {
                return callback(errno.code.ECONNREFUSED);
              }
            })
            var name = 'noInternet'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target);
              }
            ).then(
              function (template) {
                fs.existsSync(target).should.be.true;
                return template.remove();
              }
            ).then(
              function () {
                mockery.deregisterMock('dns');
                mockery.disable();
                return rimraf(target, done);
              }
            )
          }
        )

      }
    )

    describe('update',
      function () {

        var initTemplateFixturesPath;

        before(
          function () {
            updateTemplateFixturesPath = path.join(templateFixturesPath, 'update');
          }
        )

        it('should update',
          function (done) {
            var name = 'update'
              , src = 'https://github.com/carrot/sprout-sprout'
              , template = new Template(sprout, name, src);
            return template.save().then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.update();
              }
            ).then(
              function (template) {
                return template.remove();
              }
            ).then(
              function () {
                done();
              }
            )
          }
        )

        it('should throw error if not a git repo',
          function (done) {
            var name = 'noGit'
              , src = path.join(updateTemplateFixturesPath, name)
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return Promise.promisify(rimraf)(path.join(template.path, '.git'));
              }
            ).then(
              function () {
                return template.update();
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: ' + name + ' is not a git repository');
                return template.remove().then(
                  function () {
                    done();
                  }
                );
              }
            )
          }
        )

      }
    )

    describe('run',
      function () {

        var runTemplateFixturesPath;

        before(
          function () {
            runTemplateFixturesPath = path.join(templateFixturesPath, 'run');
          }
        )

        it('should run generator',
          function (done) {
            var name = 'run'
              , fixture = path.join(runTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function () {
                return template.init(target);
              }
            ).then(
              function (template) {
                return template.run(target, 'foo');
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar');
                return template.remove(name);
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('should throw if no target set',
          function (done) {
            var name = 'noTarget'
              , fixture = path.join(runTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function () {
                return template.init(target);
              }
            ).then(
              function (template) {
                return template.run(null, 'foo');
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: target path required')
                return template.remove(name).then(
                  function () {
                    return rimraf(target, done);
                  }
                );
              }
            )
          }
        )

        it('should throw if target missing',
          function (done) {
            var name = 'noTarget'
              , fixture = path.join(runTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , fakeTarget = path.join(fixture, 'doge/doge/doge/doge/doge')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function () {
                return template.init(target);
              }
            ).then(
              function (template) {
                return template.run(fakeTarget, 'foo');
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: ' + fakeTarget + ' does not exist');
                return template.remove(name).then(
                  function () {
                    return rimraf(target, done);
                  }
                );
              }
            )
          }
        )

        it('should throw if no generator name',
          function (done) {
            var name = 'noGenerator'
              , fixture = path.join(runTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function () {
                return template.init(target);
              }
            ).then(
              function (template) {
                return template.run(target, null);
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: generator name required');
                return template.remove(name).then(
                  function () {
                    return rimraf(target, done);
                  }
                );
              }
            )
          }
        )

        it('should throw if generator missing',
          function (done) {
            var name = 'generatorMissing'
              , fixture = path.join(runTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function () {
                return template.init(target);
              }
            ).then(
              function (template) {
                return template.run(target, 'foo2');
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: `foo2` is not a generator in this template');
                return template.remove(name).then(
                  function () {
                    return rimraf(target, done);
                  }
                );
              }
            )
          }
        )

        it('should run generator if it\'s a .js file',
          function (done) {
            var name = 'generatorJs'
              , fixture = path.join(runTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function () {
                return template.init(target);
              }
            ).then(
              function (template) {
                return template.run(target, 'foo');
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar');
                return template.remove(name);
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('should run generator if it\'s a .coffee file',
          function (done) {
            var name = 'generatorCoffee'
              , fixture = path.join(runTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function () {
                return template.init(target);
              }
            ).then(
              function (template) {
                return template.run(target, 'foo');
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar');
                return template.remove(name);
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('should throw error if require returns error',
          function (done) {
            var name = 'requireError'
              , fixture = path.join(runTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function () {
                return template.init(target);
              }
            ).then(
              function (template) {
                return template.run(target, 'foo');
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: Cannot find module \'foo\'');
                return template.remove(name).then(
                  function () {
                    return rimraf(target, done);
                  }
                );
              }
            )
          }
        )

        it('it should pass arguments',
          function (done) {
            var name = 'arguments'
              , fixture = path.join(runTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function () {
                return template.init(target);
              }
            ).then(
              function (template) {
                return template.run(target, 'foo', ['bar']);
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar');
                return template.remove(name);
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('it should not break if undefined is passed as arguments',
          function (done) {
            var name = 'undefinedArguments'
              , fixture = path.join(runTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return gitInit(src).then(
              function () {
                return template.save();
              }
            ).then(
              function () {
                return template.init(target);
              }
            ).then(
              function (template) {
                return template.run(target, 'foo', undefined);
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar');
                return template.remove(name);
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

      }
    )

    describe('remove',
      function () {

        var removeTemplateFixturesPath;

        before(
          function () {
            removeTemplateFixturesPath = path.join(templateFixturesPath, 'init');
          }
        )

        it('should remove',
          function (done) {
            var name = 'remove'
              , src = 'https://github.com/carrot/sprout-sprout'
              , template = new Template(sprout, name, src);
            return template.save().then(
              function () {
                return template.remove();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.false;
                done();
              }
            )
          }
        )

      }
    )

  }
)

describe('utils',
  function () {

    var utilsFixturesPath;

    before(
      function () {
        utilsFixturesPath = path.join(fixturesPath, 'utils');
      }
    )

    it('should read a file relative to src path',
      function (done) {
        var fn = 'read'
          , fixture = path.join(utilsFixturesPath, fn)
          , utils = new Utils(fixture);
        return utils.read(fn).then(
          function (output) {
            output.should.eq('bar\n');
            done();
          }
        )
      }
    )

    it('should write relative to target path',
      function (done) {
        var fn = 'write'
          , fixture = path.join(utilsFixturesPath, fn)
          , utils = new Utils(null, fixture);
        return utils.write(fn, 'bar').then(
          function () {
            fs.readFileSync(path.join(fixture, fn), 'utf8').should.eq('bar');
            return utils.remove(fn);
          }
        ).then(
          function () {
            done();
          }
        )
      }
    )

    it('should write relative to target path and should parse locals passed to third argument',
      function (done) {
        var fn = 'writeEjs'
          , fixture = path.join(utilsFixturesPath, fn)
          , utils = new Utils(null, fixture);
        return utils.write(fn, '<%= foo %>', {foo: fn}).then(
          function () {
            fs.readFileSync(path.join(fixture, fn), 'utf8').should.eq(fn);
            return utils.remove(fn);
          }
        ).then(
          function () {
            done();
          }
        )
      }
    )

    it('should rename path in target path to path relative to target path',
      function (done) {
        var fixture = path.join(utilsFixturesPath, 'rename')
          , src = fixture
          , target = fixture
          , utils = new Utils(src, target);
        return utils.rename('foo', 'bar').then(
          function () {
            fs.existsSync(path.join(target, 'bar')).should.be.true;
            return utils.rename('bar', 'foo');
          }
        ).then(
          function () {
            done();
          }
        )
      }
    )

    it('should remove a path relative to the target path',
      function (done) {
        var fn = 'remove'
          , fixture = path.join(utilsFixturesPath, fn)
          , utils = new Utils(null, fixture);
        return utils.remove(fn).then(
          function () {
            fs.existsSync(path.join(fixture, fn)).should.be.false;
            return utils.write(fn, '');
          }
        ).then(
          function () {
            done();
          }
        )
      }
    )

    it('should remove an array of paths relative to the target path',
      function (done) {
        var fn = 'removeArray'
          , fixture = path.join(utilsFixturesPath, fn)
          , utils = new Utils(null, fixture);
        return utils.remove([fn, 'foo']).then(
          function () {
            fs.existsSync(path.join(fixture, fn)).should.be.false;
            fs.existsSync(path.join(fixture, 'foo')).should.be.false;
            return utils.write(fn, '').then(
              function () {
                return utils.write('foo', '');
              }
            );
          }
        ).then(
          function () {
            done();
          }
        )
      }
    )

    it('should run a child process with the target as the cwd',
      function (done) {
        var fn = 'exec'
          , fixture = path.join(utilsFixturesPath, fn)
          , utils = new Utils(null, fixture);
        return utils.exec('pwd').then(
          function (stdout) {
            stdout.should.include(fixture + '\n');
            done();
          }
        )
      }
    )

    it('should run a child process with the target as the cwd and a nested path passed.',
      function (done) {
        var fn = 'execRelative'
          , fixture = path.join(utilsFixturesPath, fn)
          , utils = new Utils(null, fixture);
        return utils.exec('pwd', 'foo').then(
          function (stdout) {
            stdout.should.include(path.join(fixture, 'foo') + '\n');
            done();
          }
        )
      }
    )

  }
)

describe('CLI',
  function () {

    var cliFixturesPath
      , cli
      , emitter;

    before(
      function () {
        cliFixturesPath = path.join(fixturesPath, 'cli');
        cli = new CLI(path.join(cliFixturesPath, '__sprout__'));
        emitter = cli.emitter;
      }
    )

    it('should have sprout instance',
      function (done) {
        cli.sprout.should.be.ok;
        done();
      }
    )

    it('should run add method',
      function (done) {
        var action = 'add'
          , src = 'https://github.com/carrot/sprout-sprout';
        var onSuccess = function (message) {
          message.should.eq('template `' + action + '` from ' + src + ' added!');
        }
        var onError = function (error) {
          throw error;
        }
        emitter.on('success', onSuccess);
        emitter.on('error', onError);
        cli.run({action: action, name: action, src: src}).then(
          function () {
            emitter.removeListener('success', onSuccess);
            emitter.removeListener('error', onError);
            return cli.run({action: 'remove', name: action});
          }
        ).then(
          function () {
            done();
          }
        )
      }
    )

    it('should run remove method',
      function (done) {
        var action = 'remove'
          , src = 'https://github.com/carrot/sprout-sprout';
        var onSuccess = function (message) {
          message.should.eq('template `' + action + '` removed!');
        }
        var onError = function (error) {
          throw error;
        }
        cli.run({action: 'add', name: action, src: src}).then(
          function () {
            emitter.on('success', onSuccess);
            emitter.on('error', onError);
            return cli.run({action: action, name: action});
          }
        ).then(
          function () {
            emitter.removeListener('success', onSuccess);
            emitter.removeListener('error', onError);
            done();
          }
        )
      }
    )

    it('should run list method',
      function (done) {
        var action = 'list'
          , src = 'https://github.com/carrot/sprout-sprout';
        var onList = function (arr) {
          arr.should.include(action);
        }
        var onError = function (error) {
          throw error;
        }
        cli.run({action: 'add', name: action, src: src}).then(
          function () {
            emitter.on('list', onList);
            emitter.on('error', onError);
            return cli.run({action: action, name: action});
          }
        ).then(
          function () {
            emitter.removeListener('list', onList);
            emitter.removeListener('error', onError);
            return cli.run({action: 'remove', name: action});
          }
        ).then(
          function () {
            done();
          }
        )
      }
    )

    it('should emit error if no templates exist',
      function (done) {
        var onList = function (arr) {
          throw new Error();
        }
        var onError = function (error) {
          error.toString().should.eq('Error: no templates exist!');
        }
        emitter.on('list', onList);
        emitter.on('error', onError);
        cli.run({action: 'list'}).then(
          function () {
            emitter.removeListener('list', onList);
            emitter.removeListener('error', onError);
            done();
          }
        )
      }
    )

    it('should run init method',
      function (done) {
        var action = 'init'
          , fixture = path.join(cliFixturesPath, action)
          , src = path.join(fixture, 'src')
          , target = path.join(fixture, 'target');
        var onSuccess = function (message) {
          message.should.eq('template `' + action + '` initialized at ' + target + '!');
        }
        var onError = function (error) {
          throw error;
        }
        gitInit(src).then(
          function () {
            return cli.run({action: 'add', name: action, src: src});
          }
        ).then(
          function () {
            emitter.on('success', onSuccess);
            emitter.on('error', onError);
            return cli.run({action: action, name: action, target: target});
          }
        ).then(
          function () {
            emitter.removeListener('success', onSuccess);
            emitter.removeListener('error', onError);
            return cli.run({action: 'remove', name: action});
          }
        ).then(
          function () {
            return rimraf(target, done);
          }
        )
      }
    )

    it('should parse locals passed to init',
      function (done) {
        var action = 'locals'
          , fixture = path.join(cliFixturesPath, action)
          , src = path.join(fixture, 'src')
          , target = path.join(fixture, 'target');
        return gitInit(src).then(
          function () {
            return cli.run({action: 'add', name: action, src: src});
          }
        ).then(
          function () {
            return cli.run({action: 'init', name: action, target: target, locals: ['foo=bar', 'bar=foo']});
          }
        ).then(
          function () {
            fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('barfoo\n');
            return cli.run({action: 'remove', name: action});
          }
        ).then(
          function () {
            rimraf(target, done);
          }
        )
      }
    )

    it('should use inquirer if init contains questions',
      function (done) {
        var action = 'inquirer'
          , fixture = path.join(cliFixturesPath, action)
          , src = path.join(fixture, 'src')
          , target = path.join(fixture, 'target');
        return gitInit(src).then(
          function () {
            return cli.run({action: 'add', name: action, src: src});
          }
        ).then(
          function () {
            return cli.run({action: 'init', name: action, target: target, locals: {foo: 'bar'}});
          }
        ).then(
          function () {
            fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar\n');
            return cli.run({action: 'remove', name: action});
          }
        ).then(
          function () {
            rimraf(target, done);
          }
        )
      }
    )

    it('should send config file to init',
      function (done) {
        var action = 'config'
          , fixture = path.join(cliFixturesPath, action)
          , src = path.join(fixture, 'src')
          , target = path.join(fixture, 'target');
        return gitInit(src).then(
          function () {
            return cli.run({action: 'add', name: action, src: src});
          }
        ).then(
          function () {
            return cli.run({action: 'init', name: action, target: target, config: path.join(fixture, 'config.json')});
          }
        ).then(
          function () {
            fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar\n');
            return cli.run({action: 'remove', name: action});
          }
        ).then(
          function () {
            rimraf(target, done);
          }
        )
      }
    )

    it('should run generator',
      function (done) {
        var action = 'generator'
          , fixture = path.join(cliFixturesPath, action)
          , src = path.join(fixture, 'src')
          , target = path.join(fixture, 'target');
        return gitInit(src).then(
          function () {
            return cli.run({action: 'add', name: action, src: src});
          }
        ).then(
          function () {
            return cli.run({action: 'init', name: action, target: target});
          }
        ).then(
          function () {
            return cli.run({action: 'run', name: action, target: target, generator: 'foo'});
          }
        ).then(
          function () {
            fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar');
            return cli.run({action: 'remove', name: action});
          }
        ).then(
          function () {
            return rimraf(target, done);
          }
        )
      }
    )

    it('should emit error',
      function (done) {
        var onSuccess = function () {
          throw new Error();
        }
        var onError = function () {
          done();
        }
        emitter.on('success', onSuccess);
        emitter.on('error', onError);
        return cli.run({action: 'add', name: 'foo', src: 'foo'}).then(
          function () {
            emitter.removeListener('success', onSuccess);
            emitter.removeListener('error', onError);
          }
        );
      }
    )

  }
)

describe('helpers',
  function () {

    describe('isGitURL',
      function () {

        it('should determine is git url',
          function (done) {
            helpers.isGitURL('git@github.com:foo/bar').should.be.true;
            done();
          }
        )

        it('should determine is not git url',
          function (done) {
            helpers.isGitURL('asdfadsfasdf').should.be.false;
            done();
          }
        )

      }
    )

    describe('parseKeyValuesArray',
      function () {

        it('should return object',
          function (done) {
            var obj = helpers.parseKeyValuesArray(['foo=bar', 'foo2=bar2']);
            obj['foo'].should.eq('bar');
            obj['foo2'].should.eq('bar2');
            done();
          }
        )

        it('should skip if there is a missing key or value',
          function (done) {
            var obj = helpers.parseKeyValuesArray(['foo', 'foo2=bar2']);
            (obj['foo'] === undefined).should.be.true;
            obj['foo2'].should.eq('bar2');
            done();
          }
        )

        it('should return true bool if \'true\' is passed',
          function (done) {
            var obj = helpers.parseKeyValuesArray(['foo=true']);
            obj['foo'].should.be.true;
            done();
          }
        )

        it('should return false bool if \'false\' is passed',
          function (done) {
            var obj = helpers.parseKeyValuesArray(['foo=false']);
            obj['foo'].should.be.false;
            done();
          }
        )

        it('should return number if number as string is passed is passed',
          function (done) {
            var obj = helpers.parseKeyValuesArray(['foo=2']);
            obj['foo'].should.eq(2);
            done();
          }
        )

      }
    )

  }
)

/*
 * Helper function for initializing a git repository
 * in the specified directory.
 * @param {String} dir - directory to create repo in.
 */

 var gitInit = function (dir) {
   return Promise.promisify(exec)('git init .', { cwd: dir });
 }

/*
 * Helper function for `git tag` command
 * in the specified directory.
 * @param {String} dir - git repo.
 * @param {String} tag - tag to create.
 */

var gitTag = function (dir, tag) {
  return Promise.promisify(exec)('git tag ' + tag, { cwd: dir });
}

/*
 * Helper function for creating a new branch
 * in the specified git repository.
 * @param {String} dir - git repo.
 * @param {String} branch - branch to checkout.
 */

var gitCreateBranch = function (dir, branch) {
  return Promise.promisify(exec)('git checkout -b ' + branch, { cwd: dir });
}

/*
 * Helper function for `git checkout` command
 * in the specified git repository.
 * @param {String} dir - git repo.
 * @param {String} branch - branch to checkout.
 */

var gitCheckout = function (dir, branch) {
  return Promise.promisify(exec)('git checkout ' + branch, { cwd: dir });
}

/*
 * Helper function for committing all added,
 * files in a git repository.
 * @param {String} dir - git repo.
 */

var gitCommitAdd = function (dir) {
  return Promise.promisify(exec)('git add . && git commit -m \"sprout test\" .', { cwd: dir });
}

/*
 * Helper function for determining the
 * current git branch for a repository.
 * @param {String} dir - git repo.
 */

var gitCurrentBranch = function (dir) {
  return Promise.promisify(exec)('git rev-parse --abbrev-ref HEAD', { cwd: dir }).spread(
    function (stdout) {
      return stdout;
    }
  )
}
