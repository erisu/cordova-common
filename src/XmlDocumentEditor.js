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

const fs = require('fs-extra');
const elementtree = require('elementtree');
const xml = require('./util/xml-helpers');
const events = require('./events');

/**
 * Document Editor Wrapper for XML files (config.xml)
 */
class XmlDocumentEditor {
    /**
     * Document Editor Constructor
     *
     * @param {String} path XML file path
     */
    constructor (path, namespaceUri) {
        try {
            this.path = path;
            this.doc = xml.parseElementtreeSync(this.path);
            this.docroot = this.doc.getroot();
            elementtree.register_namespace(this.getCordovaNamespacePrefix(namespaceUri), namespaceUri);
        } catch (e) {
            events.emit('error', `Parsing ${path} failed`);
            throw e;
        }
    }

    getCordovaNamespacePrefix (namespaceUri) {
        const rootAtribs = Object.getOwnPropertyNames(this.docroot.attrib);
        let prefix = 'cdv';

        for (let j = 0; j < rootAtribs.length; j++) {
            if (rootAtribs[j].startsWith('xmlns:') &&
                this.doc.getroot().attrib[rootAtribs[j]] === namespaceUri) {
                const strings = rootAtribs[j].split(':');

                prefix = strings[1];
                break;
            }
        }

        return prefix;
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

        element = this.createElement(selectorPath);
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
        elements = Array.isArray(elements) ? elements : [elements];

        const value = elements
            .filter(elem => elem.attrib.name.toLowerCase() === attributeName.toLowerCase())
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

    createElement (selectorPath, attributes = {}) {
        return new elementtree.Element(selectorPath, attributes);
    }

    /**
     * writes document to config.xml path.
     */
    write () {
        fs.writeFileSync(this.path, this.doc.write({ indent: 4 }), 'utf-8');
    }
}

module.exports = XmlDocumentEditor;
