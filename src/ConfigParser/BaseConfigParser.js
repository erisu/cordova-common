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

const XmlDocumentEditor = require('../XmlDocumentEditor');
const CordovaError = require('../CordovaError/CordovaError');
const events = require('../events');

class BaseConfigParser {
    constructor (path) {
        this.path = path;

        try {
            this.editor = new XmlDocumentEditor(this.path, 'http://cordova.apache.org/ns/1.0');
            this.cdvNamespacePrefix = this.editor.getCordovaNamespacePrefix();
            this.doc = this.editor.getDoc(); // only used in test spec.
            this.docroot = this.editor.getDocRoot();
        } catch (e) {
            console.log(e);
            events.emit('error', `Parsing "${path}" failed`);
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
        events.emit('log', 'method "packageName" has been deprecated, please update to use method "getPackageName".');
        return this.getPackageName();
    }

    name () {
        events.emit('log', 'method "name" has been deprecated, please update to use method "getName".');
        return this.getName();
    }

    shortName () {
        events.emit('log', 'method "shortName" has been deprecated, please update to use method "getShortName".');
        return this.getShortName();
    }

    description () {
        events.emit('log', 'method "description" has been deprecated, please update to use method "getDescription".');
        return this.getDescription();
    }

    author () {
        events.emit('log', 'method "author" has been deprecated, please update to use method "getAuthor".');
        return this.getAuthor();
    }

    version () {
        events.emit('log', 'method "version" has been deprecated, please update to use method "getVersion".');
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

    getAttribute (attribute) {
        return this.docroot.attrib[attribute];
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
        const element = this.editor.findOrCreate('name');
        if (!element.text) element.text = shortname;
        element.attrib.short = shortname;
        return this;
    }

    getShortName () {
        return this.editor.find('name').attrib.short || this.getName();
    }

    setDescription (text) {
        this.editor.findOrCreate('description').text = text;
        return this;
    }

    getDescription () {
        return this.editor.getNodeTextSafe(this.doc.find('description'));
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

    /*
     * Preference Element Methods
     */
    setGlobalPreference (name, value) {
        let preference = this.editor.find(`preference[@name="${name}"]`);

        if (!preference) {
            preference = this.editor.createElement('preference');
            preference.attrib.name = name;
            this.docroot.append(preference);
        }

        preference.attrib.value = value;
    }

    getGlobalPreference (name) {
        return this.editor.findElementAttributeValue(name, this.editor.findAll('preference'));
    }

    setPlatformPreference (name, platform, value) {
        // This is needed to be backwards supportive.
        // Should be removed when platform is dropped from the API.
        this.platform = this.platform || platform;

        const platformElement = this.doc.find(`./platform[@name="${this.platform}"]`);

        if (!platformElement) {
            throw new CordovaError(`platform does not exist (received platform: ${this.platform})`);
        }

        const elems = this.findAllPlatformElement('preference');
        let preference = elems
            .filter((elem) => elem.attrib.name.toLowerCase() === name.toLowerCase())
            .pop();

        if (!preference) {
            preference = this.editor.createElement('preference');
            preference.attrib.name = name;
            platformElement.append(preference);
        }

        preference.attrib.value = value;
    }

    getPlatformPreference (name, platform) {
        if (platform) {
            events.emit('log', 'The "platform" argument "getPlatformPreference" is deprecated and will be removed in the near future.');
            this.platform = this.platform || platform;
        }

        return this.editor.findElementAttributeValue(name, this.findAllPlatformElement('preference'));
    }

    setPreference (name, platform, value) {
        // This is needed to be backwards supportive.
        // Should be removed when platform is dropped from the API.
        this.platform = this.platform || platform;

        if (!value) {
            value = platform;
            platform = undefined;
        }

        if (platform) {
            this.setPlatformPreference(name, platform, value);
        } else {
            this.setGlobalPreference(name, value);
        }
    }

    /**
     * @todo Remove this method and use the exact method getGlobalPreference or getPlatformPreference.
     * Alternative: Could this handle fetching globals first and then append platforms? As merge/override.
     */
    getPreference (name, platform) {
        // This is needed to be backwards supportive.
        // Should be removed when platform is dropped from the API.
        this.platform = this.platform || platform;
        events.emit('log', 'The "getPreference" method has been deprecated. Please replace with the exact method "getGlobalPreference" or "getPlatformPreference".');
        return platform ? this.getPlatformPreference(name) : this.getGlobalPreference(name);
    }

    /**
     * Returns all resources for the platform specified.
     * @param  {String} platform     The platform.
     * @param {string}  resourceName Type of static resources to return.
     *                               "icon" and "splash" currently supported.
     * @return {Array}               Resources for the platform specified.
     */
    getStaticResources (platform, resourceName) {
        const ret = [];
        let staticResources = [];

        if (platform) { // platform specific icons
            this.doc.findall(`./platform[@name="${platform}"]/${resourceName}`).forEach(elt => {
                elt.platform = platform; // mark as platform specific resource
                staticResources.push(elt);
            });
        }

        // root level resources
        staticResources = staticResources.concat(this.doc.findall(resourceName));

        // parse resource elements
        staticResources.forEach(elt => {
            const res = {
                src: elt.attrib.src,
                target: elt.attrib.target || undefined,
                density: elt.attrib.density || elt.attrib[this.cdvNamespacePrefix + ':density'] || elt.attrib['gap:density'],
                platform: elt.platform || null, // null means icon represents default icon (shared between platforms
                width: +elt.attrib.width || undefined,
                height: +elt.attrib.height || undefined,
                background: elt.attrib.background || undefined,
                foreground: elt.attrib.foreground || undefined
            };

            // default icon
            if (!res.width && !res.height && !res.density) {
                ret.defaultResource = res;
            }

            ret.push(res);
        });

        /**
         * Returns resource with specified width and/or height.
         * @param  {number} width Width of resource.
         * @param  {number} height Height of resource.
         * @return {Resource} Resource object or null if not found.
         */
        ret.getBySize = function (width, height) {
            return ret.filter(
                res => (!res.width && !res.height)
                    ? false
                    : (
                        (!res.width || (width === res.width)) &&
                    (!res.height || (height === res.height))
                    )
            )[0] || null;
        };

        /**
         * Returns resource with specified density.
         * @param  {string} density Density of resource.
         * @return {Resource}       Resource object or null if not found.
         */
        ret.getByDensity = function (density) {
            return ret.filter(res => res.density === density)[0] || null;
        };

        /** Returns default icons */
        ret.getDefault = function () {
            return ret.defaultResource;
        };

        return ret;
    }

    /**
     * Returns all icons for specific platform.
     * @param  {string} platform Platform name
     * @return {Resource[]}      Array of icon objects.
     */
    getIcons (platform) {
        return this.getStaticResources(platform, 'icon');
    }

    /**
     * Returns all splash images for specific platform.
     * @param  {string} platform Platform name
     * @return {Resource[]}      Array of Splash objects.
     */
    getSplashScreens (platform) {
        return this.getStaticResources(platform, 'splash');
    }

    /**
     * Returns all resource-files for a specific platform.
     * @param  {string} platform Platform name
     * @param  {boolean} includeGlobal Whether to return resource-files at the
     *                                 root level.
     * @return {Resource[]}      Array of resource file objects.
     */
    getFileResources (platform, includeGlobal) {
        var fileResources = [];

        if (platform) { // platform specific resources
            fileResources = this.doc.findall(`./platform[@name="${platform}"]/resource-file`).map(tag => ({
                platform: platform,
                src: tag.attrib.src,
                target: tag.attrib.target,
                versions: tag.attrib.versions,
                deviceTarget: tag.attrib['device-target'],
                arch: tag.attrib.arch
            }));
        }

        if (includeGlobal) {
            this.doc.findall('resource-file').forEach(tag => {
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
     * @return {Array}               Script elements.
     */
    getHookScripts (hook, platforms) {
        let scriptElements = this.doc.findall('./hook');

        if (platforms) {
            platforms.forEach(platform => {
                scriptElements = scriptElements.concat(this.doc.findall(`./platform[@name="${platform}"]/hook`));
            });
        }

        return scriptElements
            .filter(element => element.attrib.src && element.attrib.type && element.attrib.type.toLowerCase() === hook);
    }

    /**
    * Returns a list of plugin (IDs).
    *
    * This function also returns any plugin's that
    * were defined using the legacy <feature> tags.
    * @return {string[]} Array of plugin IDs
    */
    getPluginIdList () {
        const plugins = this.doc.findall('plugin');
        const result = plugins.map(plugin => plugin.attrib.name);

        this.doc.findall('feature').forEach(element => {
            const idTag = element.find('./param[@name="id"]');

            if (idTag) result.push(idTag.attrib.value);
        });

        return result;
    }

    getPlugins () {
        return this.getPluginIdList()
            .map(pluginId => this.getPlugin(pluginId));
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
        const element = this.editor.createElement('plugin');
        element.attrib.name = attributes.name;

        if (attributes.spec) element.attrib.spec = attributes.spec;

        // support arbitrary object as variables source
        if (variables && typeof variables === 'object' && !Array.isArray(variables)) {
            variables = Object.keys(variables)
                .map(variableName => ({
                    name: variableName,
                    value: variables[variableName]
                }));
        }

        if (variables) {
            variables.forEach(variable => {
                element.append(
                    // Creates new variable element
                    this.editor.createElement('variable', {
                        name: variable.name,
                        value: variable.value
                    })
                );
            });
        }

        this.docroot.append(element);
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

        const pluginElement = this.doc.find(`./plugin/[@name="${id}"]`);

        if (pluginElement === null) {
            const legacyFeature = this.doc.find(`./feature/param[@name="id"][@value="${id}"]/..`);
            if (legacyFeature) {
                events.emit('log', `Found deprecated feature entry for ${id}" in config.xml.`);
                return featureToPlugin(legacyFeature);
            }
            return undefined;
        }

        const plugin = {
            name: pluginElement.attrib.name,
            spec: pluginElement.attrib.spec || pluginElement.attrib.src || pluginElement.attrib.version,
            variables: {}
        };

        pluginElement.findall('variable').forEach(varElement => {
            const name = varElement.attrib.name;

            if (name) {
                plugin.variables[name] = varElement.attrib.value;
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
        const root = this.docroot;
        this.editor.removeChildren(root, `./plugin/[@name="${id}"]`);
        this.editor.removeChildren(root, `./feature/param[@name="id"][@value="${id}"]/..`);
    }

    // Add any element to the root
    addElement (name, attributes) {
        const element = this.editor.createElement(name);

        for (const attribute in attributes) {
            element.attrib[attribute] = attributes[attribute];
        }

        this.docroot.append(element);
    }

    /**
     * Adds an engine. Does not check for duplicates.
     * @param  {String} name the engine name
     * @param  {String} spec engine source location or version (optional)
     */
    addEngine (name, spec) {
        if (!name) return;

        const element = this.editor.createElement('engine');

        element.attrib.name = name;
        if (spec) element.attrib.spec = spec;

        this.docroot.append(element);
    }

    /**
     * Removes all the engines with given name
     * @param  {String} name the engine name.
     */
    removeEngine (name) {
        this.editor.removeChildren(this.docroot, `./engine/[@name="${name}"]`);
    }

    getEngines () {
        return this.doc.findall('./engine')
            .map(engine => ({
                name: engine.attrib.name,
                spec: engine.attrib.spec || engine.attrib.version || null
            }));
    }

    /* Get all the access tags */
    getAccesses () {
        return this.doc.findall('./access')
            .map(access => ({
                origin: access.attrib.origin,
                minimum_tls_version: access.attrib['minimum-tls-version'], /* String */
                requires_forward_secrecy: access.attrib['requires-forward-secrecy'], /* Boolean */
                requires_certificate_transparency: access.attrib['requires-certificate-transparency'], /* Boolean */
                allows_arbitrary_loads_in_web_content: access.attrib['allows-arbitrary-loads-in-web-content'], /* Boolean */
                allows_arbitrary_loads_in_media: access.attrib['allows-arbitrary-loads-in-media'], /* Boolean (DEPRECATED) */
                allows_arbitrary_loads_for_media: access.attrib['allows-arbitrary-loads-for-media'], /* Boolean */
                allows_local_networking: access.attrib['allows-local-networking'] /* Boolean */
            }));
    }

    /* Get all the allow-navigation tags */
    getAllowNavigations () {
        return this.doc.findall('./allow-navigation').map(allow_navigation => ({
            href: allow_navigation.attrib.href,
            minimum_tls_version: allow_navigation.attrib['minimum-tls-version'], /* String */
            requires_forward_secrecy: allow_navigation.attrib['requires-forward-secrecy'], /* Boolean */
            requires_certificate_transparency: allow_navigation.attrib['requires-certificate-transparency'] /* Boolean */
        }));
    }

    /* Get all the allow-intent tags */
    getAllowIntents () {
        return this.doc.findall('./allow-intent').map(allow_intent => ({
            href: allow_intent.attrib.href
        }));
    }

    /* Get all edit-config tags */
    getEditConfigs (platform) {
        return this.doc.findall('edit-config')
            .concat(this.doc.findall(`./platform[@name="${platform}"]/edit-config`))
            .map(tag => ({
                file: tag.attrib.file,
                target: tag.attrib.target,
                mode: tag.attrib.mode,
                id: 'config.xml',
                xmls: tag.getchildren()
            }));
    }

    /* Get all config-file tags */
    getConfigFiles (platform) {
        return this.doc.findall('config-file')
            .concat(this.doc.findall(`./platform[@name="${platform}"]/config-file`))
            .map(tag => ({
                target: tag.attrib.target,
                parent: tag.attrib.parent,
                after: tag.attrib.after,
                xmls: tag.getchildren(),
                // To support demuxing via versions
                versions: tag.attrib.versions,
                deviceTarget: tag.attrib['device-target']
            }));
    }

    write () {
        this.editor.write();
    }
}

function featureToPlugin (featureElement) {
    const plugin = {
        variables: []
    };

    let pluginVersion;
    let pluginSrc;

    featureElement.findall('param').forEach(element => {
        const name = element.attrib.name;
        const value = element.attrib.value;
        if (name === 'id') {
            plugin.name = value;
        } else if (name === 'version') {
            pluginVersion = value;
        } else if (name === 'url' || name === 'installPath') {
            pluginSrc = value;
        } else {
            plugin.variables[name] = value;
        }
    });

    const spec = pluginSrc || pluginVersion;
    if (spec) plugin.spec = spec;

    return plugin;
}

module.exports = BaseConfigParser;
