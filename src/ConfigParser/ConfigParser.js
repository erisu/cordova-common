/**
    Licensed to the Apache Software Foundation (ASF) under one
    or more contributor license agreements.  See the NOTICE file
    distributed with this work for additional information
    regarding copyright ownership.  The ASF licenses this file
    to you under the Apache License, Version 2.0 (the
    "License"); you may not use this file except in compliance
    with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing,
    software distributed under the License is distributed on an
    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, either express or implied.  See the License for the
    specific language governing permissions and limitations
    under the License.
*/

const et = require('elementtree');
const xml = require('../util/xml-helpers');
const CordovaError = require('../CordovaError/CordovaError');
const fs = require('fs-extra');
const events = require('../events');

/**
 * config.xml document editor wrapper.
 */
class DocumentEditor {
    /**
     * Document Editor Constructor
     *
     * @param {String} path config.xml path
     */
    constructor (path) {
        try {
            this.path = path;
            this.doc = xml.parseElementtreeSync(this.path);
            this.docroot = this.doc.getroot();
        } catch (e) {
            events.emit('error', `Parsing ${path} failed`);
            throw e;
        }
    }

    /**
     * returns the parsed element tree.
     *
     * @returns {ElementTree} Document's element tree.
     */
    getDoc () {
        return this.doc;
    }

    /**
     * returns the root element of the parsed element tree document.
     *
     * @returns {Element} node element
     */
    getDocRoot () {
        return this.docroot;
    }

    /**
     * finds and returns the first element by the selector/path.
     *
     * @param {String} selectorPath lookup value
     *
     * @returns {Element} node element
     */
    find (selectorPath) {
        return this.doc.find(selectorPath);
    }

    /**
     * finds and returns all targeted elements that matches with the selector/path.
     *
     * @param {String} selectorPath lookup value
     *
     * @returns {Array} collection of node {Element}s
     */
    findAll (selectorPath) {
        return this.doc.findall(selectorPath);
    }

    /**
     * finds node by selector/path or appends new node if missing.
     *
     * @param {String} selectorPath
     *
     * @returns {Element} node element
     */
    findOrCreate (selectorPath) {
        let element = this.doc.find(selectorPath);

        if (element) return element;

        element = new et.Element(selectorPath);
        this.docroot.append(element);

        return element;
    }

    /**
     * returns the node's element string safe text.
     *
     * @param {ElementTreeNode} element node element
     *
     * @returns {String} element's text
     */
    getNodeTextSafe (element) {
        return element && element.text && element.text.trim();
    }

    /**
     * Finds the value of an element's attribute
     *
     * @param  {String} attributeName Name of the attribute to search for
     * @param  {Array}  elements         An array of ElementTree nodes
     *
     * @returns {String}
     */
    findElementAttributeValue (attributeName, elements) {
        elements = Array.isArray(elements) ? elements : [ elements ];

        let value = elements.filter(elem => elem.attrib.name.toLowerCase() === attributeName.toLowerCase())
            .map(filteredElements => filteredElements.attrib.value)
            .pop();

        return value || '';
    }

    /**
     * Remoces all child items in the provided ElementTree node that matches the selector.
     *
     * @param {ElementTreeNode} element ElementTree Node
     * @param {String} selectorPath selector/path lookup value
     */
    removeChildren (element, selectorPath) {
        element.findall(selectorPath).forEach(child => element.remove(child));
    }

    /**
     * writes document to config.xml path.
     */
    write () {
        fs.writeFileSync(this.path, this.doc.write({indent: 4}), 'utf-8');
    }
}

/**
 * Wraps the config.xml file
 */
class ConfigParser {
    constructor (path) {
        this.path = path;

        try {
            this.editor = new DocumentEditor(this.path);
            this.doc = this.editor.getDoc(); // only used in test spec.
            this.docroot = this.editor.getDocRoot();
            this.cdvNamespacePrefix = this.getCordovaNamespacePrefix();
            et.register_namespace(this.cdvNamespacePrefix, 'http://cordova.apache.org/ns/1.0');
        } catch (e) {
            throw e;
        }

        if (this.docroot.tag !== 'widget') {
            throw new CordovaError(`${path} has incorrect root node name (expected "widget", was "${this.docroot.tag}")`);
        }
    }

    /*
     * Deprecated Methods
     */
    packageName () {
        events.emit('log', 'method packageName has been deprecated, please update to use method getPackageName.');
        return this.getPackageName();
    }

    name () {
        events.emit('log', 'method name has been deprecated, please update to use method getName.');
        return this.getName();
    }

    shortName () {
        events.emit('log', 'method shortName has been deprecated, please update to use method getShortName.');
        return this.getShortName();
    }

    description () {
        events.emit('log', 'method description has been deprecated, please update to use method getDescription.');
        return this.getDescription();
    }

    author () {
        events.emit('log', 'method author has been deprecated, please update to use method getAuthor.');
        return this.getAuthor();
    }

    version () {
        events.emit('log', 'method version has been deprecated, please update to use method getVersion.');
        return this.getVersion();
    }

    /*
     * Document Manipulator Methods
     */
    findAllPlatformElement (element) {
        return this.editor.findAll(`./platform[@name="${this.platform}"]/${element}`);
    }

    /*
     * Primary Methods
     */
    setAttribute (attribute, value) {
        this.docroot.attrib[attribute] = value;
        return this;
    }

    getAttribute (attr) {
        return this.docroot.attrib[attr];
    }

    setPackageName (id) {
        this.setAttribute('id', id);
        return this;
    }

    getPackageName () {
        return this.getAttribute('id');
    }

    setName (name) {
        this.editor.findOrCreate('name').text = name;
        return this;
    }

    getName () {
        return this.editor.getNodeTextSafe(this.editor.find('name'));
    }

    setShortName (shortname) {
        let el = this.editor.findOrCreate('name');

        if (!el.text) el.text = shortname;

        el.attrib['short'] = shortname;

        return this;
    }

    getShortName () {
        return this.editor.find('name').attrib['short'] || this.getName();
    }

    setDescription (text) {
        this.editor.findOrCreate('description').text = text;
        return this;
    }

    getDescription () {
        return this.editor.getNodeTextSafe(this.editor.find('description'));
    }

    setVersion (version) {
        this.setAttribute('version', version);
        return this;
    }

    getVersion () {
        return this.getAttribute('version');
    }

    getAuthor () {
        return this.editor.getNodeTextSafe(this.editor.find('author'));
    }

    setGlobalPreference (name, value) {
        let pref = this.editor.find(`preference[@name="${name}"]`);

        if (!pref) {
            pref = new et.Element('preference');
            pref.attrib.name = name;
            this.docroot.append(pref);
        }

        pref.attrib.value = value;

        return this;
    }

    getGlobalPreference (name) {
        return this.editor.findElementAttributeValue(name, this.editor.findAll('preference'));
    }

    getPlatformPreference (name) {
        return this.editor.findElementAttributeValue(name, this.findAllPlatformElement('preference'));
    }

    /**
     * @todo Remove this method and use the exact method getGlobalPreference or getPlatformPreference.
     * Alternative: Could this handle fetching globals first and then append platforms? As merge/override.
     */
    getPreference (name, platform) {
        // events.emit('log', 'The getPreference method has been deprecated. Please replace with the exact method getGlobalPreference or getPlatformPreference.');
        return platform ? this.getPlatformPreference(name) : this.getGlobalPreference(name);
    }

    parseResourceElements (element) {
        return {
            src: element.attrib.src,
            width: +element.attrib.width || undefined,
            height: +element.attrib.height || undefined
        };
    }

    getDefaultResourceElement (ret) {
        return ret.find(resource => !resource.width && !resource.height);
    }

    /**
     * Returns all resources for the platform specified.
     * @param  {String} platform     The platform.
     * @param {string}  resourceName Type of static resources to return.
     *                               "icon" and "splash" currently supported.
     * @returns {Array}               Resources for the platform specified.
     */
    getStaticResources (platform, resourceName) {
        let staticResources = [];

        if (platform) { // platform specific icons
            events.emit('log', 'The platform argument for getStaticResources has been deprecated. getStaticResources will use globally defined platform.');

            this.findAllPlatformElement(resourceName).forEach((element) => {
                element.platform = this.platform; // mark as platform specific resource
                staticResources.push(element);
            });
        }

        // root level resources
        staticResources = staticResources.concat(this.editor.findAll(resourceName));

        // parse resource elements
        let resources = staticResources.map(this.parseResourceElements, this);
        resources = this.parseResourceMethods(resources);

        return resources;
    }

    parseResourceMethods (resources) {
        /**
         * Returns resource with specified width and/or height.
         * @param  {number} width Width of resource.
         * @param  {number} height Height of resource.
         * @returns {Resource} Resource object or null if not found.
         */
        resources.getBySize = function (width, height) {
            return resources.filter((res) => {
                if (!res.width && !res.height) return false;

                return (
                    (!res.width || (width === res.width)) &&
                    (!res.height || (height === res.height))
                );
            })[0] || null;
        };

        /** Returns default icons */
        resources.getDefault = () => this.getDefaultResourceElement(resources);

        return resources;
    }

    /**
     * Returns all icons for specific platform.
     * @param  {string} platform Platform name
     * @returns {Resource[]}      Array of icon objects.
     */
    getIcons (platform) {
        return this.getStaticResources(platform, 'icon');
    }

    /**
     * Returns all splash images for specific platform.
     * @param  {string} platform Platform name
     * @returns {Resource[]}      Array of Splash objects.
     */
    getSplashScreens (platform) {
        return this.getStaticResources(platform, 'splash');
    }

    /**
     * Returns all resource-files for a specific platform.
     * @param  {string} platform Platform name
     * @param  {boolean} includeGlobal Whether to return resource-files at the
     *                                 root level.
     * @returns {Resource[]}      Array of resource file objects.
     */
    getFileResources (platform, includeGlobal) {
        let fileResources = [];

        if (platform) { // platform specific resources
            fileResources = this.findAllPlatformElement('resource-file').map(function (tag) {
                return {
                    platform: platform,
                    src: tag.attrib.src,
                    target: tag.attrib.target,
                    versions: tag.attrib.versions,
                    deviceTarget: tag.attrib['device-target'],
                    arch: tag.attrib.arch
                };
            });
        }

        if (includeGlobal) {
            this.editor.findAll('resource-file').forEach(function (tag) {
                fileResources.push({
                    platform: platform || null,
                    src: tag.attrib.src,
                    target: tag.attrib.target,
                    versions: tag.attrib.versions,
                    deviceTarget: tag.attrib['device-target'],
                    arch: tag.attrib.arch
                });
            });
        }

        return fileResources;
    }

    /**
     * Returns all hook scripts for the hook type specified.
     * @param  {String} hook     The hook type.
     * @param {Array}  platforms Platforms to look for scripts into (root scripts will be included as well).
     * @returns {Array}               Script elements.
     */
    getHookScripts (hook, platforms) {
        let scriptElements = this.editor.findAll('./hook');

        if (platforms) {
            platforms.forEach((platform) => {
                scriptElements = scriptElements.concat(this.editor.findAll(`./platform[@name="${platform}"]/hook`));
            });
        }

        // Filter Scripts by Hook Type
        return scriptElements.filter(el => el.attrib.src && el.attrib.type && el.attrib.type.toLowerCase() === hook);
    }

    /**
    * Returns a list of plugin (IDs).
    *
    * This function also returns any plugin's that
    * were defined using the legacy <feature> tags.
    * @returns {string[]} Array of plugin IDs
    */
    getPluginIdList () {
        let plugins = this.editor.findAll('plugin').map(function (plugin) {
            return plugin.attrib.name;
        });

        this.editor.findAll('feature').forEach(function (element) {
            let idTag = element.find('./param[@name="id"]');

            if (idTag) {
                plugins.push(idTag.attrib.value);
            }
        });
        return plugins;
    }

    getPlugins () {
        return this.getPluginIdList().map((pluginId) => this.getPlugin(pluginId));
    }

    /**
     * Adds a plugin element. Does not check for duplicates.
     * @name addPlugin
     * @function
     * @param {object} attributes name and spec are supported
     * @param {Array|object} variables name, value or arbitary object
     */
    addPlugin (attributes, variables) {
        if (!attributes && !attributes.name) return;

        let el = new et.Element('plugin');
        el.attrib.name = attributes.name;

        if (attributes.spec) {
            el.attrib.spec = attributes.spec;
        }

        // support arbitrary object as variables source
        if (variables && typeof variables === 'object' && !Array.isArray(variables)) {
            variables = Object.keys(variables)
                .map((variableName) => {
                    return {name: variableName, value: variables[variableName]};
                });
        }

        if (variables) {
            variables.forEach((variable) => {
                el.append(new et.Element('variable', { name: variable.name, value: variable.value }));
            });
        }

        this.docroot.append(el);
    }

    /**
     * Retrives the plugin with the given id or null if not found.
     *
     * This function also returns any plugin's that
     * were defined using the legacy <feature> tags.
     * @name getPlugin
     * @function
     * @param {String} id
     * @returns {object} plugin including any variables
     */
    getPlugin (id) {
        if (!id) return undefined;

        let pluginElement = this.editor.find(`./plugin/[@name="${id}"]`);

        if (pluginElement === null) {
            let legacyFeature = this.editor.find(`./feature/param[@name="id"][@value="${id}"]/..`);

            if (legacyFeature) {
                events.emit('log', `Found deprecated feature entry for ${id} in config.xml.`);
                return this.featureToPlugin(legacyFeature);
            }
            return undefined;
        }

        let plugin = {};

        plugin.name = pluginElement.attrib.name;
        plugin.spec = pluginElement.attrib.spec || pluginElement.attrib.src || pluginElement.attrib.version;
        plugin.variables = {};

        let variableElements = pluginElement.findall('variable');

        variableElements.forEach(function (varElement) {
            let name = varElement.attrib.name;
            let value = varElement.attrib.value;

            if (name) {
                plugin.variables[name] = value;
            }
        });

        return plugin;
    }

    /**
     * Remove the plugin entry with give name (id).
     *
     * This function also operates on any plugin's that
     * were defined using the legacy <feature> tags.
     * @name removePlugin
     * @function
     * @param id name of the plugin
     */
    removePlugin (id) {
        if (!id) return;

        this.editor.removeChildren(this.docroot, `./plugin/[@name="${id}"]`);
        this.editor.removeChildren(this.docroot, `./feature/param[@name="id"][@value="${id}"]/..`);
    }

    // Add any element to the root
    addElement (name, attributes) {
        let el = et.Element(name);

        for (let a in attributes) {
            el.attrib[a] = attributes[a];
        }

        this.docroot.append(el);
    }

    /**
     * Adds an engine. Does not check for duplicates.
     * @param  {String} name the engine name
     * @param  {String} spec engine source location or version (optional)
     */
    addEngine (name, spec) {
        if (!name) return;

        let el = et.Element('engine');
        el.attrib.name = name;

        if (spec) {
            el.attrib.spec = spec;
        }
        this.docroot.append(el);
    }

    /**
     * Removes all the engines with given name
     * @param  {String} name the engine name.
     */
    removeEngine (name) {
        this.editor.removeChildren(this.docroot, `./engine/[@name="${name}"]`);
    }

    getEngines () {
        let engines = this.editor.findAll('./engine');

        return engines.map(function (engine) {
            let spec = engine.attrib.spec || engine.attrib.version;

            return {
                name: engine.attrib.name,
                spec: spec || null
            };
        });
    }

    /* Get all the access tags */
    getAccesses () {
        let accesses = this.editor.findAll('./access');

        return accesses.map((access) => {
            let minimum_tls_version = access.attrib['minimum-tls-version']; /* String */
            let requires_forward_secrecy = access.attrib['requires-forward-secrecy']; /* Boolean */
            let requires_certificate_transparency = access.attrib['requires-certificate-transparency']; /* Boolean */
            let allows_arbitrary_loads_in_web_content = access.attrib['allows-arbitrary-loads-in-web-content']; /* Boolean */
            let allows_arbitrary_loads_in_media = access.attrib['allows-arbitrary-loads-in-media']; /* Boolean (DEPRECATED) */
            let allows_arbitrary_loads_for_media = access.attrib['allows-arbitrary-loads-for-media']; /* Boolean */
            let allows_local_networking = access.attrib['allows-local-networking']; /* Boolean */

            return {
                origin: access.attrib.origin,
                minimum_tls_version: minimum_tls_version,
                requires_forward_secrecy: requires_forward_secrecy,
                requires_certificate_transparency: requires_certificate_transparency,
                allows_arbitrary_loads_in_web_content: allows_arbitrary_loads_in_web_content,
                allows_arbitrary_loads_in_media: allows_arbitrary_loads_in_media,
                allows_arbitrary_loads_for_media: allows_arbitrary_loads_for_media,
                allows_local_networking: allows_local_networking
            };
        });
    }

    /* Get all the allow-navigation tags */
    getAllowNavigations () {
        let allow_navigations = this.editor.findAll('./allow-navigation');

        return allow_navigations.map((allow_navigation) => {
            let minimum_tls_version = allow_navigation.attrib['minimum-tls-version']; /* String */
            let requires_forward_secrecy = allow_navigation.attrib['requires-forward-secrecy']; /* Boolean */
            let requires_certificate_transparency = allow_navigation.attrib['requires-certificate-transparency']; /* Boolean */

            return {
                href: allow_navigation.attrib.href,
                minimum_tls_version: minimum_tls_version,
                requires_forward_secrecy: requires_forward_secrecy,
                requires_certificate_transparency: requires_certificate_transparency
            };
        });
    }

    /* Get all the allow-intent tags */
    getAllowIntents () {
        let allow_intents = this.editor.findAll('./allow-intent');

        return allow_intents.map((allow_intent) => {
            return {
                href: allow_intent.attrib.href
            };
        });
    }

    /* Get all edit-config tags */
    getEditConfigs () {
        let platform_edit_configs = this.findAllPlatformElement('edit-config');
        let edit_configs = this.editor.findAll('edit-config').concat(platform_edit_configs);

        return edit_configs.map(function (tag) {
            let editConfig = {
                file: tag.attrib['file'],
                target: tag.attrib['target'],
                mode: tag.attrib['mode'],
                id: 'config.xml',
                xmls: tag.getchildren()
            };

            return editConfig;
        });
    }

    /* Get all config-file tags */
    getConfigFiles () {
        let platform_config_files = this.findAllPlatformElement('config-file');
        let config_files = this.editor.findAll('config-file').concat(platform_config_files);

        return config_files.map(function (tag) {
            let configFile = {
                target: tag.attrib['target'],
                parent: tag.attrib['parent'],
                after: tag.attrib['after'],
                xmls: tag.getchildren(),
                // To support demuxing via versions
                versions: tag.attrib['versions'],
                deviceTarget: tag.attrib['device-target']
            };

            return configFile;
        });
    }

    getCordovaNamespacePrefix () {
        let rootAtribs = Object.getOwnPropertyNames(this.editor.getDoc().getroot().attrib);
        let prefix = 'cdv';

        for (let j = 0; j < rootAtribs.length; j++) {
            if (rootAtribs[j].startsWith('xmlns:') && this.editor.getDoc().getroot().attrib[rootAtribs[j]] === 'http://cordova.apache.org/ns/1.0') {
                let strings = rootAtribs[j].split(':');
                prefix = strings[1];
                break;
            }
        }

        return prefix;
    }

    featureToPlugin (featureElement) {
        let plugin = {variables: []};
        let pluginVersion;
        let pluginSrc;
        let nodes = featureElement.findall('param');

        nodes.forEach((element) => {
            let n = element.attrib.name;
            let v = element.attrib.value;

            if (n === 'id') {
                plugin.name = v;
            } else if (n === 'version') {
                pluginVersion = v;
            } else if (n === 'url' || n === 'installPath') {
                pluginSrc = v;
            } else {
                plugin.variables[n] = v;
            }
        });

        let spec = pluginSrc || pluginVersion;
        if (spec) plugin.spec = spec;

        return plugin;
    }

    write () {
        this.editor.write();
    }
}

module.exports = ConfigParser;
