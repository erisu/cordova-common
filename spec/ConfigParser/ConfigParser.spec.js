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
const path = require('path');
const fs = require('fs-extra');
const ConfigParser = require('../../src/ConfigParser/ConfigParser');
const xml = path.join(__dirname, '../fixtures/test-config.xml');
const xml_contents = fs.readFileSync(xml, 'utf-8');

describe('config.xml parser', () => {
    let readFile; /* eslint no-unused-vars : 0 */

    beforeEach(() => {
        readFile = spyOn(fs, 'readFileSync').and.returnValue(xml_contents);
    });

    it('Test 001 : should create an instance based on an xml file', () => {
        let config;

        expect(() => {
            config = new ConfigParser(xml);
        }).not.toThrow();

        expect(config).toBeDefined();
        expect(config.doc).toBeDefined();
    });

    describe('methods', () => {
        let config;

        beforeEach(() => {
            config = new ConfigParser(xml);
        });

        describe('package name / id', () => {
            it('Test 002 : should get the (default) packagename', () => {
                expect(config.packageName()).toEqual('io.cordova.hellocordova');
            });

            it('Test 003 : should allow setting the packagename', () => {
                config.setPackageName('this.is.bat.country');
                expect(config.packageName()).toEqual('this.is.bat.country');
            });
        });

        describe('version', () => {
            it('Test 006 : should get the version', () => {
                expect(config.version()).toEqual('0.0.1');
            });

            it('Test 007 : should allow setting the version', () => {
                config.setVersion('2.0.1');
                expect(config.version()).toEqual('2.0.1');
            });
        });

        describe('app name', () => {
            it('Test 008 : should get the (default) app name', () => {
                expect(config.name()).toEqual('Hello Cordova');
            });

            it('Test 009 : should allow setting the app name', () => {
                config.setName('this.is.bat.country');
                expect(config.name()).toEqual('this.is.bat.country');
            });

            describe('short name', () => {
                it('should default to the app name', () => {
                    expect(config.shortName()).toEqual('Hello Cordova');
                });

                it('should allow setting the app short name', () => {
                    config.setShortName('Hi CDV');
                    expect(config.name()).toEqual('Hello Cordova');
                    expect(config.shortName()).toEqual('Hi CDV');
                });
            });
        });

        describe('preference', () => {
            it('Test 010 : should return the value of a global preference', () => {
                expect(config.getPreference('fullscreen')).toEqual('true');
            });

            it('Test 012 : should return an empty string for a non-existing preference', () => {
                expect(config.getPreference('zimzooo!')).toEqual('');
            });
        });

        describe('global preference', () => {
            it('Test 013 : should return the value of a global preference', () => {
                expect(config.getGlobalPreference('orientation')).toEqual('portrait');
            });

            it('Test 014 : should return an empty string for a non-existing preference', () => {
                expect(config.getGlobalPreference('foobar')).toEqual('');
            });

            it('Test 017 : should return an empty string when querying with unsupported platform', () => {
                expect(config.getPreference('orientation', 'foobar')).toEqual('');
            });
        });

        describe('plugin', () => {
            it('Test 018 : should read plugin id list', () => {
                const expectedList = [
                    'org.apache.cordova.pluginwithvars',
                    'org.apache.cordova.pluginwithurl',
                    'org.apache.cordova.pluginwithversion',
                    'org.apache.cordova.pluginwithurlandversion',
                    'org.apache.cordova.justaplugin',
                    'org.apache.cordova.legacyfeatureversion',
                    'org.apache.cordova.legacyfeatureurl',
                    'org.apache.cordova.legacyfeatureversionandurl'
                ];

                const list = config.getPluginIdList();

                expect(list.length).toEqual(expectedList.length);

                expectedList.forEach((plugin) => {
                    expect(list).toContain(plugin);
                });
            });

            it('Test 019 : should read plugin given id', () => {
                const plugin = config.getPlugin('org.apache.cordova.justaplugin');

                expect(plugin).toBeDefined();
                expect(plugin.name).toEqual('org.apache.cordova.justaplugin');
                expect(plugin.variables).toBeDefined();
            });

            it('Test 020 : should not read plugin given undefined id', () => {
                const plugin = config.getPlugin('org.apache.cordova.undefinedplugin');

                expect(plugin).not.toBeDefined();
            });

            it('Test 021 : should read plugin with src and store it in spec field', () => {
                const plugin = config.getPlugin('org.apache.cordova.pluginwithurl');

                expect(plugin.spec).toEqual('http://cordova.apache.org/pluginwithurl');
            });

            it('Test 022 : should read plugin with version and store it in spec field', () => {
                const plugin = config.getPlugin('org.apache.cordova.pluginwithversion');

                expect(plugin.spec).toEqual('1.1.1');
            });

            it('Test 023 : should read plugin with source and version and store source in spec field', () => {
                const plugin = config.getPlugin('org.apache.cordova.pluginwithurlandversion');

                expect(plugin.spec).toEqual('http://cordova.apache.org/pluginwithurlandversion');
            });

            it('Test 024 : should read plugin variables', () => {
                const plugin = config.getPlugin('org.apache.cordova.pluginwithvars');

                expect(plugin.variables).toBeDefined();
                expect(plugin.variables.var).toBeDefined();
                expect(plugin.variables.var).toEqual('varvalue');
            });

            it('Test 025 : should allow adding a new plugin', () => {
                config.addPlugin({name: 'myplugin'});

                const plugins = config.doc.findall('plugin');
                const pluginNames = plugins.map(plugin => plugin.attrib.name);

                expect(pluginNames).toContain('myplugin');
            });

            it('Test 026 : should allow adding features with params', () => {
                config.addPlugin({name: 'aplugin'}, [{name: 'paraname', value: 'paravalue'}]);

                // Additional check for new parameters syntax
                config.addPlugin({name: 'bplugin'}, {paraname: 'paravalue'});

                const plugins = config.doc.findall('plugin')
                    .filter(plugin => plugin.attrib.name === 'aplugin' || plugin.attrib.name === 'bplugin');

                expect(plugins.length).toBe(2);

                plugins.forEach(function (plugin) {
                    const variables = plugin.findall('variable');

                    expect(variables[0].attrib.name).toEqual('paraname');
                    expect(variables[0].attrib.value).toEqual('paravalue');
                });
            });

            it('Test 027 : should be able to read legacy feature entries with a version', () => {
                const plugin = config.getPlugin('org.apache.cordova.legacyfeatureversion');

                expect(plugin).toBeDefined();
                expect(plugin.name).toEqual('org.apache.cordova.legacyfeatureversion');
                expect(plugin.spec).toEqual('1.2.3');
                expect(plugin.variables).toBeDefined();
                expect(plugin.variables.aVar).toEqual('aValue');
            });

            it('Test 028 : should be able to read legacy feature entries with a url', () => {
                const plugin = config.getPlugin('org.apache.cordova.legacyfeatureurl');

                expect(plugin).toBeDefined();
                expect(plugin.name).toEqual('org.apache.cordova.legacyfeatureurl');
                expect(plugin.spec).toEqual('http://cordova.apache.org/legacyfeatureurl');
            });

            it('Test 029 : should be able to read legacy feature entries with a version and a url', () => {
                const plugin = config.getPlugin('org.apache.cordova.legacyfeatureversionandurl');

                expect(plugin).toBeDefined();
                expect(plugin.name).toEqual('org.apache.cordova.legacyfeatureversionandurl');
                expect(plugin.spec).toEqual('http://cordova.apache.org/legacyfeatureversionandurl');
            });

            it('Test 030 : it should remove given plugin', () => {
                config.removePlugin('org.apache.cordova.justaplugin');

                const plugins = config.doc.findall('plugin');
                const pluginNames = plugins.map(plugin => plugin.attrib.name);

                expect(pluginNames).not.toContain('org.apache.cordova.justaplugin');
            });

            it('Test 031 : it should remove given legacy feature id', () => {
                config.removePlugin('org.apache.cordova.legacyplugin');

                const plugins = config.doc.findall('feature');
                const pluginNames = plugins.map(plugin => plugin.attrib.name);

                expect(pluginNames).not.toContain('org.apache.cordova.legacyplugin');
            });

            it('Test 032 : it should read <access> tag entries', () => {
                const accesses = config.getAccesses();

                expect(accesses.length).not.toEqual(0);
            });

            it('Test 033 : it should read <allow-navigation> tag entries', () => {
                const navigations = config.getAllowNavigations();

                expect(navigations.length).not.toEqual(0);
            });

            it('Test 034 : it should read <allow-intent> tag entries', () => {
                const intents = config.getAllowIntents();

                expect(intents.length).not.toEqual(0);
            });
        });

        describe('static resources', () => {
            const hasPlatformPropertyDefined = e => !!e.platform;
            const hasSrcPropertyDefined = e => !!e.src;
            const hasTargetPropertyDefined = e => !!e.target;
            const hasDensityPropertyDefined = e => !!e.density;
            const hasPlatformPropertyUndefined = e => !e.platform;

            it('Test 035 : should fetch shared resources if platform parameter is not specified', () => {
                expect(config.getStaticResources(null, 'icon').length).toBe(2);
                expect(config.getStaticResources(null, 'icon').every(hasPlatformPropertyUndefined)).toBeTruthy();
            });

            it('Test 038 : should have getDefault method to fetch default resources property', () => {
                expect(config.getStaticResources(null, 'icon').getDefault()).toBeDefined();
                expect(config.getStaticResources(null, 'icon').getDefault().src).toBe('icon.png');
            });

            it('Test 039 : should have getDefault method returning defaultResource property', () => {
                expect(config.getStaticResources(null, 'icon').getDefault()).toEqual(config.getStaticResources(null, 'icon').getDefault());
            });
        });
    });
});
