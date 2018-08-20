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

/* eslint no-control-regex: 0 */

const fs = require('fs-extra');
const path = require('path');

var modules = {};
var addProperty = require('../util/addProperty');

// Use delay loading to ensure plist and other node modules to not get loaded
// on Android, Windows platforms
addProperty(module, 'bplist', 'bplist-parser', modules);
// addProperty(module, 'et', 'elementtree', modules);
// addProperty(module, 'glob', 'glob', modules);
addProperty(module, 'plist', 'plist', modules);
addProperty(module, 'plist_helpers', '../util/plist-helpers', modules);
// addProperty(module, 'xml_helpers', '../util/xml-helpers', modules);

const xml_helpers = require('../util/xml-helpers');
const et = require('elementtree');
const glob = require('glob');

/******************************************************************************
* ConfigFile class
*
* Can load and keep various types of config files. Provides some functionality
* specific to some file types such as grafting XML children. In most cases it
* should be instantiated by ConfigKeeper.
*
* For plugin.xml files use as:
* plugin_config = self.config_keeper.get(plugin_dir, '', 'plugin.xml');
*
* TODO: Consider moving it out to a separate file and maybe partially with
* overrides in platform handlers.
******************************************************************************/
class ConfigFile {
    constructor (project_dir, platform, file_tag) {
        console.log(0);
        this.project_dir = project_dir;
        console.log(1);
        // An actual exisiting file or false when missing.
        this.targetFile = path.normalize(path.join(project_dir, file_tag));
        console.log(2);
        this.filepath = this.resolveFile(this.targetFile) || false;
        console.log(3);
        // this.isLoaded = false;

        // this.platform = platform;
        // this.file_tag = file_tag;
        this.is_changed = false;
        console.log(4);
        if (!this.filepath) throw new Error(`Unable to find the targeted file ${this.targetFile}`);
        console.log(5);
        // Load file properties
        this.loadFileProperties();
        console.log(6);
        // loads the exisiting file
        this.load();
        console.log(7);
    }

    /**
     * @todo Deprecate
     */
    resolveConfigFilePath (project_dir, platform, file) {
        return this.resolveFile(path.join(project_dir, file));
    }

    resolveFile (file) {
        if (fs.existsSync(file)) return file;

        let matches;
        if (file.includes('*')) {
            // handle wildcards in targets using glob.
            matches = glob.sync(path.join(this.project_dir, '**', file));
            if (matches.length) return matches[0];
        }

        return false;
    }

    loadFileProperties () {
        this.mtime = fs.statSync(this.filepath).mtime;

        const extension = path.extname(this.filepath).split('.');
        this.extension = extension[extension.length - 1];
    }

    load () {
        if (this.extension === 'xml') {
            this.type = this.extension;
            this.data = xml_helpers.parseElementtreeSync(this.filepath);
        } else {
            throw new Error(`Unabled to load the requested file ${this.filepath}. The appropriate loader for ${this.extension} files are missing.`);
        }

        // // Windows8 uses an appxmanifest, and wp8 will likely use
        // // the same in a future release
        // if (ext === '.xml' || ext === '.appxmanifest' || ext === '.storyboard') {
        //     this.type = 'xml';
        //     this.data = modules.xml_helpers.parseElementtreeSync(this.filepath);
        // } else {
        //     // plist file
        //     this.type = 'plist';
        //     // TODO: isBinaryPlist() reads the file and then parse re-reads it again.
        //     //       We always write out text plist, not binary.
        //     //       Do we still need to support binary plist?
        //     //       If yes, use plist.parseStringSync() and read the file once.
        //     this.data = isBinaryPlist(this.filepath) ?
        //         modules.bplist.parseBuffer(fs.readFileSync(this.filepath))[0] :
        //         modules.plist.parse(fs.readFileSync(this.filepath, 'utf8'));
        // }
    }

    save () {
        if (this.extension === 'xml') {
            fs.writeFileSync(this.filepath, this.data.write({indent: 4}), 'utf-8');
            this.is_changed = false;
        } else {
            throw new Error(`Unable to save the requested file ${this.filepath}. The appropriate save configurations for ${this.extension} files are missing.`);
        }

        //     // plist
        //     var regExp = new RegExp('<string>[ \t\r\n]+?</string>', 'g');
        //     fs.writeFileSync(this.filepath, modules.plist.build(this.data).replace(regExp, '<string></string>'));
    }

    graft_child (selector, xml_child) {
        if (this.extension === 'xml') {
            let result;
            const xml_to_graft = [et.XML(xml_child.xml)];

            switch (xml_child.mode) {
            case 'merge':
                result = xml_helpers.graftXMLMerge(this.data, xml_to_graft, selector, xml_child);
                break;

            case 'overwrite':
                result = xml_helpers.graftXMLOverwrite(this.data, xml_to_graft, selector, xml_child);
                break;

            case 'remove':
                result = xml_helpers.pruneXMLRemove(this.data, selector, xml_to_graft);
                break;

            default:
                result = xml_helpers.graftXML(this.data, xml_to_graft, selector, xml_child.after);
                break;
            }

            if (!result) {
                throw new Error(`Unable to graft xml at selector ${selector} from ${this.filepath} during config install`);
            }

            this.is_changed = true;
        } else {
            throw new Error(`Unable to graft the requested file ${this.filepath}. The appropriate grafting configurations ${this.extension} files are missing.`);
        }

        // // plist file
        // result = modules.plist_helpers.graftPLIST(this.data, xml_child.xml, selector);

        // if (!result) {
        //     throw new Error(`Unable to graft plist ${this.filepath} during config install`);
        // }
    }

    prune_child (selector, xml_child) {
        if (this.extension === 'xml') {
            let result;
            const xml_to_graft = [et.XML(xml_child.xml)];

            switch (xml_child.mode) {
            case 'merge':
            case 'overwrite':
                result = xml_helpers.pruneXMLRestore(this.data, selector, xml_child);
                break;

            case 'remove':
                result = xml_helpers.pruneXMLRemove(this.data, selector, xml_to_graft);
                break;

            default:
                result = xml_helpers.pruneXML(this.data, xml_to_graft, selector);
                break;
            }

            if (!result) {
                throw new Error(`Pruning at selector ${selector} from ${this.filepath} went bad.`);
            }

            this.is_changed = true;
        } else {
            throw new Error(`Unable to prune the requested file ${this.filepath}. The appropriate prunning configurations ${this.extension} files are missing.`);
        }

        // // plist file
        // result = modules.plist_helpers.prunePLIST(this.data, xml_child.xml, selector);
    }
}

// // Some config-file target attributes are not qualified with a full leading directory, or contain wildcards.
// // Resolve to a real path in this function.
// // TODO: getIOSProjectname is slow because of glob, try to avoid calling it several times per project.
// function resolveConfigFilePath (project_dir, platform, file) {
//     var filepath = path.join(project_dir, file);
//     var matches;

//     file = path.normalize(file);

//     if (file.includes('*')) {
//         // handle wildcards in targets using glob.
//         matches = modules.glob.sync(path.join(project_dir, '**', file));
//         if (matches.length) filepath = matches[0];

//         // [CB-5989] multiple Info.plist files may exist. default to $PROJECT_NAME-Info.plist
//         if (matches.length > 1 && file.includes('-Info.plist')) {
//             var plistName = getIOSProjectname(project_dir) + '-Info.plist';
//             for (var i = 0; i < matches.length; i++) {
//                 if (matches[i].includes(plistName)) {
//                     filepath = matches[i];
//                     break;
//                 }
//             }
//         }
//         return filepath;
//     }

//     // XXX this checks for android studio projects
//     // only if none of the options above are satisfied does this get called
//     // TODO: Move this out of cordova-common and into the platforms somehow
//     if (platform === 'android' && !fs.existsSync(filepath)) {
//         if (file === 'AndroidManifest.xml') {
//             filepath = path.join(project_dir, 'app', 'src', 'main', 'AndroidManifest.xml');
//         } else if (file.endsWith('config.xml')) {
//             filepath = path.join(project_dir, 'app', 'src', 'main', 'res', 'xml', 'config.xml');
//         } else if (file.endsWith('strings.xml')) {
//             // Plugins really shouldn't mess with strings.xml, since it's able to be localized
//             filepath = path.join(project_dir, 'app', 'src', 'main', 'res', 'values', 'strings.xml');
//         } else if (file.includes(path.join('res', 'xml'))) {
//             // Catch-all for all other stored XML configuration in legacy plugins
//             var config_file = path.basename(file);
//             filepath = path.join(project_dir, 'app', 'src', 'main', 'res', 'xml', config_file);
//         }
//         return filepath;
//     }

//     // special-case config.xml target that is just "config.xml" for other platforms. This should
//     // be resolved to the real location of the file.
//     // TODO: Move this out of cordova-common into platforms
//     if (file === 'config.xml') {
//         if (platform === 'ubuntu') {
//             filepath = path.join(project_dir, 'config.xml');
//         } else if (platform === 'ios' || platform === 'osx') {
//             filepath = path.join(
//                 project_dir,
//                 module.exports.getIOSProjectname(project_dir),
//                 'config.xml'
//             );
//         } else {
//             matches = modules.glob.sync(path.join(project_dir, '**', 'config.xml'));
//             if (matches.length) filepath = matches[0];
//         }
//         return filepath;
//     }

//     // None of the special cases matched, returning project_dir/file.
//     return filepath;
// }

// // Some config-file target attributes are not qualified with a full leading directory, or contain wildcards.
// // Resolve to a real path in this function.
// // TODO: getIOSProjectname is slow because of glob, try to avoid calling it several times per project.
// function resolveConfigFilePath (project_dir, platform, file) {
//     let filepath = path.join(project_dir, file);

//     if (fs.existsSync(filepath)) {
//         return filepath;
//     }

//     let matches;

//     file = path.normalize(file);

//     if (file.includes('*')) {
//         // handle wildcards in targets using glob.
//         matches = modules.glob.sync(path.join(project_dir, '**', file));
//         if (matches.length) filepath = matches[0];
//     }

//     return filepath;
// }

// Find out the real name of an iOS or OSX project
// TODO: glob is slow, need a better way or caching, or avoid using more than once.
function getIOSProjectname (project_dir) {
    var matches = modules.glob.sync(path.join(project_dir, '*.xcodeproj'));
    var iospath;
    if (matches.length === 1) {
        iospath = path.basename(matches[0], '.xcodeproj');
    } else {
        var msg;
        if (matches.length === 0) {
            msg = 'Does not appear to be an xcode project, no xcode project file in ' + project_dir;
        } else {
            msg = 'There are multiple *.xcodeproj dirs in ' + project_dir;
        }
        throw new Error(msg);
    }
    return iospath;
}

// determine if a plist file is binary
function isBinaryPlist (filename) {
    // I wish there was a synchronous way to read only the first 6 bytes of a
    // file. This is wasteful :/
    var buf = '' + fs.readFileSync(filename, 'utf8');
    // binary plists start with a magic header, "bplist"
    return buf.substring(0, 6) === 'bplist';
}

module.exports = ConfigFile;
module.exports.isBinaryPlist = isBinaryPlist;
module.exports.getIOSProjectname = getIOSProjectname;
// module.exports.resolveConfigFilePath = resolveConfigFilePath;
