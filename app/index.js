'use strict';
var yeoman = require('yeoman-generator');
var yosay = require('yosay');
var chalk = require('chalk');
var mkdirp = require('mkdirp');
var path = require('path');
var guid = require('uuid');
var projectName = require('vs_projectname');
var pckg = require('../package.json');
var AspnetGenerator = yeoman.generators.Base.extend({

  constructor: function() {
    yeoman.generators.Base.apply(this, arguments);

    this.argument('type', { type: String, required: false, desc: 'the project type to create' });
    this.argument('applicationName', { type: String, required: false, desc: 'the name of the application' });
    this.argument('ui', {type: String, required: false, defaults: 'bootstrap', desc: 'the ui library to use (bootstrap OR semantic)'});
  },


  init: function() {
    this.log(yosay('Welcome to the awe-inspiring Rightpoint SharePoint Project generator!'));
    this.templatedata = {};
  },

  _checkProjectType: function() {
    if (this.type) {
      //normalize to lower case
      this.type = this.type.toLowerCase();
      var validProjectTypes = [
        'angular16'
      ];

      if (validProjectTypes.indexOf(this.type) === -1) {
        //if it's not in the list, send them through the normal path
        this.log('"%s" is not a valid project type', chalk.cyan(this.type));
        this.type = undefined;
        this.applicationName = undefined;
      } else {
        this.log('Creating "%s" project', chalk.cyan(this.type));
      }
    }
  },

  askFor: function() {
    this._checkProjectType();
    if (!this.type) {
      var done = this.async();

      var prompts = [{
        type: 'list',
        name: 'type',
        message: 'What type of application do you want to create?',
        choices: [
          {
            name: 'Angular 1.6 Project',
            value: 'angular16'
          }
        ]
      },
      {
        type    : 'input',
        name    : 'baseLocation',
        message : 'Where do you want to put the new solution?',
        default : 'C:\\Projects' // Default to current folder name
      },
      {
          type: 'list',
          name: 'ui',
          message: 'Which Style framework would you like to use?',
          default: 'sass',
          choices: [
            {
              name: 'SASS',
              value: 'sass'
            },
            {
              name: 'LESS (not available)',
              value: 'less'
            }
          ],
          when: function (answers){
            return answers.type === 'angular16';
          }
      }
      ];

      this.prompt(prompts, function (props) {
        this.type = props.type;
        this.ui = props.ui;
        this.baseLocation = props.baseLocation;
        done();
        this.log()
      }.bind(this));
    }
  },

  _buildTemplateData: function() {
    this.templatedata.namespace = projectName(this.applicationName);
    this.templatedata.applicationName = this.applicationName;
    this.templatedata.deploymentProjectName = this.deploymentProjectName;
    this.templatedata.projectName = this.applicationName;
    this.templatedata.clientCode = this.clientCode;
    this.templatedata.includeApplicationInsights = false;
    this.templatedata.guid = guid.v4();
    this.templatedata.sqlite = (this.type === 'mvc') ? true : false;
    this.templatedata.ui = this.ui;
    this.templatedata.version = "1.0.0-rc4-004771";
    this.templatedata.dotnet = {
      version: this.options['versionCurrent'] ?
        pckg.dotnet.current.version : pckg.dotnet.lts.version,
      targetFramework: this.options['versionCurrent'] ?
        pckg.dotnet.current.targetFramework : pckg.dotnet.lts.targetFramework
    };
  },

  askForName: function() {
    if (!this.applicationName) {
      var done = this.async();
      var app = '';
      var clientAbbreviation = 'RP';
      switch (this.type) {
        case 'angular16':
          app = 'Rightpoint.SharePoint';
          break;        
      }
      var prompts = [{
        name: 'applicationName',
        message: 'What\'s the name of your Angular 1.6 application?',
        default: app
      },
      {
        name: 'clientCode',
        message: 'What\'s the abbreviation of the client?',
        default: clientAbbreviation
      }];
      this.prompt(prompts, function (props) {        
        this.applicationName = props.applicationName;
        this.deploymentProjectName = this.applicationName + '.Deployment'
        this.solutionPath = this.baseLocation + '/' + this.applicationName;
        this.deploymentPath = this.solutionPath + '/Deployment';
        this.codePath = this.solutionPath + '/Code';
        this.deploymentProjectPath = this.deploymentPath + '/' + this.deploymentProjectName;
        this.clientCode = props.clientCode;
        this._buildTemplateData();
        done();
      }.bind(this));
    } else {
      this._buildTemplateData();
    }
  },

  writing: function() {
    this.sourceRoot(path.join(__dirname, './templates/projects'));

    switch (this.type) {
      case 'angular16':
        this.sourceRoot(path.join(__dirname, '../templates/projects/' + this.type));
        
        this.copy(this.sourceRoot() + '/../../gitignore.txt', this.solutionPath + '/.gitignore');
        this.fs.copyTpl(this.sourceRoot() + '/../../Solution.sln', this.deploymentPath + '/' + this.applicationName + '.sln', this.templatedata);

        // directories
        mkdirp.sync(this.solutionPath + '/Code');
        mkdirp.sync(this.solutionPath + '/Deployment');

        mkdirp.sync(this.deploymentProjectPath + '/Jobs');
        mkdirp.sync(this.deploymentProjectPath + '/Properties');
        mkdirp.sync(this.deploymentProjectPath + '/Templates');

        mkdirp.sync(this.codePath + '/css');
        mkdirp.sync(this.codePath + '/DisplayTemplates');
        mkdirp.sync(this.codePath + '/images');
        mkdirp.sync(this.codePath + '/js');
        mkdirp.sync(this.codePath + '/js/dist');
        mkdirp.sync(this.codePath + '/js/includes');
        mkdirp.sync(this.codePath + '/js/lib');
        mkdirp.sync(this.codePath + '/js/src');
        mkdirp.sync(this.codePath + '/js/src/components');
        mkdirp.sync(this.codePath + '/js/src/main');
        mkdirp.sync(this.codePath + '/js/src/services');
        mkdirp.sync(this.codePath + '/js/src/singular');
        mkdirp.sync(this.codePath + '/MasterPages');
        mkdirp.sync(this.codePath + '/PageLayouts');
        mkdirp.sync(this.codePath + '/Pages');
        mkdirp.sync(this.codePath + '/WebParts');
        
        mkdirp.sync(this.projectPath + '/Templates/Sections');

        
        this.fs.copyTpl(this.sourceRoot() + '/Company.ConsoleApplication1.csproj', this.deploymentProjectPath + '/' + this.deploymentProjectName + '.csproj', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/Program.cs', this.deploymentProjectPath + '/Program.cs', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/App.config', this.deploymentProjectPath + '/App.config', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/gulpfile.js', this.deploymentProjectPath + '/gulpfile.js', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/package.json', this.deploymentProjectPath + '/package.json', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/packages.config', this.deploymentProjectPath + '/packages.config', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/ProvisioningHelper.cs', this.deploymentProjectPath + '/ProvisioningHelper.cs', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/AssemblyInfo.cs', this.projectdeploymentProjectPathPath + '/Properties/AssemblyInfo.cs', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/Settings.Designer.cs', this.deploymentProjectPath + '/StringExtensions.cs', this.templatedata);

        this.fs.copyTpl(this.sourceRoot() + '/Jobs/0-GetProvisioningXml.cs', this.deploymentProjectPath + '/Jobs/0-GetProvisioningXml.cs', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/Jobs/1-RunProvisioningXml.cs', this.deploymentProjectPath + '/Jobs/1-RunProvisioningXml.cs', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/Jobs/3-ImportDataFile.cs', this.deploymentProjectPath + '/Jobs/3-ImportDataFile.cs', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/Jobs/4-CreateSitesAndSubsites.cs', this.deploymentProjectPath + '/Jobs/4-CreateSitesAndSubsites.cs', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/Jobs/2-ProvisionGroupSites.cs', this.deploymentProjectPath + '/Jobs/2-ProvisionGroupSites.cs', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/Jobs/JobBase.cs', this.deploymentProjectPath + '/Jobs/JobBase.cs', this.templatedata);

        this.fs.copyTpl(this.sourceRoot() + '/Resources/common.js', this.codePath + '/js/src/main/common.js', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/Resources/config.js', this.codePath + '/js/src/main/config.js', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/Resources/main.js', this.codePath + '/js/src/main/main.js', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/Resources/modal.js', this.codePath + '/js/src/main/modal.js', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/Resources/ui-helper.js', this.codePath + '/js/src/main/ui-helper.js', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/Resources/modal-service.js', this.codePath + '/js/src/services/modal-service.js', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/Resources/storage-service.js', this.codePath + '/js/src/services/storage-service.js', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/Resources/taxonomy-service.js', this.codePath + '/js/src/services/taxonomy-service.js', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/Resources/user-profile-service.js', this.codePath + '/js/src/services/user-profile-service.js', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/Resources/yammer-api-service.js', this.codePath + '/js/src/services/yammer-api-service.js', this.templatedata);

        this.copy(this.sourceRoot() + '/Resources/main.master', this.codePath + '/MasterPages/main.master');
        this.copy(this.sourceRoot() + '/Resources/modal.scss', this.codePath + '/css/sass/modal.scss');
        this.copy(this.sourceRoot() + '/Resources/index.aspx', this.codePath + '/Pages/index.aspx');

        this.copy(this.sourceRoot() + '/Templates/1-TermSet.xml', this.deploymentProjectPath + '/Templates/1-TermSet.xml');
        this.copy(this.sourceRoot() + '/Templates/2-InformationArchitecture.xml', this.deploymentProjectPath + '/Templates/2-InformationArchitecture.xml');
        this.copy(this.sourceRoot() + '/Templates/3-Files.xml', this.deploymentProjectPath + '/Templates/3-Files.xml');
        this.copy(this.sourceRoot() + '/Templates/4-Pages.xml', this.deploymentProjectPath + '/Templates/4-Pages.xml');
        this.copy(this.sourceRoot() + '/Templates/5-SecurityGroups.xml', this.deploymentProjectPath + '/Templates/5-SecurityGroups.xml');
        this.copy(this.sourceRoot() + '/Templates/6-Search.xml', this.deploymentProjectPath + '/Templates/6-Search.xml');

        this.fs.copyTpl(this.sourceRoot() + '/Templates/Sections/ContentTypes.xml', this.deploymentProjectPath + '/Templates/Sections/ContentTypes.xml', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/Templates/Sections/Files.xml', this.deploymentProjectPath + '/Templates/Sections/Files.xml', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/Templates/Sections/FilesSearch.xml', this.deploymentProjectPath + '/Templates/Sections/FilesSearch.xml', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/Templates/Sections/Lists.xml', this.deploymentProjectPath + '/Templates/Sections/Lists.xml', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/Templates/Sections/Pages.xml', this.deploymentProjectPath + '/Templates/Sections/Pages.xml', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/Templates/Sections/Security.xml', this.deploymentProjectPath + '/Templates/Sections/Security.xml', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/Templates/Sections/SiteFields.xml', this.deploymentProjectPath + '/Templates/Sections/SiteFields.xml', this.templatedata);
        this.fs.copyTpl(this.sourceRoot() + '/Templates/Sections/TermSets.xml', this.deploymentProjectPath + '/Templates/Sections/TermSets.xml', this.templatedata);

        this.copy(this.sourceRoot() + '/Resources/lib/angular.min.js', this.codePath + '/js/lib/angular.min.js');
        this.copy(this.sourceRoot() + '/Resources/lib/angular.min.js.map', this.codePath + '/js/lib/angular.min.js.map');
        this.copy(this.sourceRoot() + '/Resources/lib/bootstrap.min.css', this.codePath + '/js/lib/bootstrap.min.css');
        this.copy(this.sourceRoot() + '/Resources/lib/bootstrap.min.js', this.codePath + '/js/lib/bootstrap.min.js');
        this.copy(this.sourceRoot() + '/Resources/lib/es6-promise.min.js', this.codePath + '/js/lib/es6-promise.min.js');
        this.copy(this.sourceRoot() + '/Resources/lib/fetch.min.js', this.codePath + '/js/lib/fetch.min.js');
        this.copy(this.sourceRoot() + '/Resources/lib/modernizr.min.js', this.codePath + '/js/lib/modernizr.min.js');
        this.copy(this.sourceRoot() + '/Resources/lib/pnp.min.js', this.codePath + '/js/lib/pnp.min.js');
        this.copy(this.sourceRoot() + '/Resources/lib/pnp.min.js.map', this.codePath + '/js/lib/pnp.min.js.map');
        

        if(this.ui == "less") {
          mkdirp.sync(this.codePath + '/css/less');
        } else {
          mkdirp.sync(this.codePath + '/css/sass');
        }
        break;
      default:
        this.log('Unknown project type');
    }
  },

  /**
   * Called on the very end of Yo execution
   * Dependencies are installed only for web type
   * of projects that depends on client side libraries
   * and tools like Gulp or Grunt
   * Uses can skip installing dependencies using built-in yo
   * --skip-install option
   */
  end: function() {
    if(!this.options['skip-install'] && (this.type === 'angular16' || this.type === 'mvc' || this.type === 'mvcbasic' || this.type === "fsharp_mvcbasic")) {
      process.chdir(this.deploymentProjectPath);
      this.installDependencies({
        npm: false,
        callback: this._showUsageHints.bind(this)
      });
    } else {
      this._showUsageHints();
    }
    this.spawnCommand('dotnet restore');
  },

  /**
   * Shows usage hints to end user
   * Called on the very end of all processes
   */
  _showUsageHints: function() {
    this.log('\r\n');
    this.log('Your project is now created, you can use the following commands to get going');
    this.log(chalk.green('    cd "' + this.applicationName + '"'));
    this.log(chalk.green('    dotnet restore'));
    this.log(chalk.green('    dotnet build') + ' (optional, build will also happen when it\'s run)');
    if(this.type === 'mvc') {
      this.log(chalk.green('    dotnet ef database update') + ' (to create the SQLite database for the project)');
    }
    switch (this.type) {
      case 'console':
        this.log(chalk.green('    dotnet run'));
        break;
      case 'web':
      case 'nancy':
      case 'mvc':
      case 'webapi':
      case 'mvcbasic':
      case 'fsharp_console':
      case 'fsharp_webapi':
      case 'fsharp_mvcbasic':
      case 'fsharp_web':
        this.log(chalk.green('    dotnet run'));
        break;
      case 'xunit':
      case 'fsharp_mstest':
      case 'fsharp_xunit':
        this.log(chalk.green('    dotnet test'));
        break;
    }

    this.log('\r\n');
  }
});

module.exports = AspnetGenerator;
