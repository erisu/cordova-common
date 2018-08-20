/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/
/* jshint sub:true */

const path = require('path');
const ConfigFile = require('./ConfigFile');

/******************************************************************************
* ConfigKeeper class
*
* Used to load and store config files to avoid re-parsing and writing them out
* multiple times.
*
* The config files are referred to by a fake path constructed as
* project_dir/platform/file
* where file is the name used for the file in config munges.
******************************************************************************/
class ConfigKeeper {
    constructor (project_dir, plugins_dir) {
        this.project_dir = project_dir;
        this.plugins_dir = plugins_dir;
        this._cached = {};
    }

    get (project_dir, platform, file) {
        // This fixes a bug with older plugins - when specifying config xml instead of res/xml/config.xml
        // https://issues.apache.org/jira/browse/CB-6414
        file = file === 'config.xml' ? 'res/xml/config.xml' : file;

        const fake_path = path.join(project_dir, platform, file);

        // File was not cached, need to load.
        if (!this._cached[fake_path]) {
            this._cached[fake_path] = this.loadFile(project_dir, platform, file);
        }

        return this._cached[fake_path];
    }

    loadFile (project_dir, platform, file) {
        return new ConfigFile(project_dir, platform, file);
    }

    save_all () {
        Object.keys(this._cached).forEach((fake_path) => {
            if (this._cached[fake_path].is_changed) this._cached[fake_path].save();
        });
    }
}

module.exports = ConfigKeeper;
