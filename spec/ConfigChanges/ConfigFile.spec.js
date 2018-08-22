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

const rewire = require('rewire');
// const configFile = rewire('../../src/ConfigChanges/ConfigFile');
const ConfigFile = rewire('../../src/ConfigChanges/ConfigFile');
const fs = require('fs-extra');
const path = require('path');
// const projectDir = path.join('project_dir', 'app', 'src', 'main');

describe('ConfigFile', () => {
    let existsSync;
    
    beforeEach(() => {
        // spyOn(configFile, 'isBinaryPlist').and.callThrough();

        spyOn(fs, 'statSync').and.returnValue({mtime: 0});
        existsSync = spyOn(fs, 'existsSync');
        spyOn(fs, 'readFileSync').and.returnValue('<?xml version="1.0" encoding="utf-8"?>');
    });

    it('ConfigFile_save/ConfigFile.prototype.save', () => {
        existsSync.and.returnValue(true);

        spyOn(fs, 'writeFileSync');

        const config = new ConfigFile('project_dir', 'platform', 'file.xml');
        config.data.write = jasmine.createSpy('xmlWrite');

        config.save();

        expect(config.data.write).toHaveBeenCalled();
        expect(fs.writeFileSync).toHaveBeenCalled();
    });

    // it('isBinaryPlist should return false if not binary', () => {
    //     spyOn(fs, 'readFileSync').and.returnValue('not bplist');
    //     expect(configFile.isBinaryPlist('someFile')).toBe(false);
    // });
    // it('isBinaryPlist should return true if binary', () => {
    //     spyOn(fs, 'readFileSync').and.returnValue('bplist');
    //     expect(configFile.isBinaryPlist('someFile')).toBe(true);
    // });

    // it('getIOSProjectname should throw error', () => {
    //     expect(() => { configFile.getIOSProjectname('some/project/name'); }).toThrow();
    // });

    it('resolveConfigFilePath should return file path', () => {
        existsSync.and.returnValue(true);

        const config = new ConfigFile('project_dir', 'platform', 'file.xml');
        const filePath = path.join('project_dir', 'file.xml');

        expect(config.resolveConfigFilePath('project_dir', 'platform', 'file.xml')).toBe(filePath);
    });

    it('resolveFile should return file path', () => {
        existsSync.and.returnValue(true);

        const config = new ConfigFile('project_dir', 'platform', 'file.xml');
        const filePath = path.join('project_dir', 'file.xml');

        expect(config.resolveFile(filePath)).toBe(filePath);
    });

    it('ConfigFile constructor should throw error if resolveFile fail.', () => {
        existsSync.and.returnValue(false);

        const filePath = path.join('project_dir', 'file.xml');

        expect(() => { 
            const config = new ConfigFile('project_dir', 'platform', 'file.xml');
        }).toThrow(new Error(`Unable to find the targeted file ${filePath}`));
    });

    // fit('resolveConfigFilePath should return file path', () => {
    //     existsSync.and.returnValue(false);

    //     // 'project_dir', 'app', 'src', 'main', AndroidManifest.xml
    //     const config = new AndroidConfigFile('project_dir', 'android', 'AndroidManifest.xml');
    //     const androidManifestPath = path.join(projectDir, 'AndroidManifest.xml');
    //     expect(config.resolveConfigFilePath(projectDir, 'android', 'AndroidManifest.xml')).toBe(androidManifestPath);
    // });

    // it('resolveConfigFilePath should return file path', () => {
    //     var configPath = path.join(projectDir, 'res', 'xml', 'config.xml');
    //     expect(configFile.resolveConfigFilePath('project_dir', 'android', 'config.xml')).toBe(configPath);
    // });

    // it('resolveConfigFilePath should return file path', () => {
    //     var stringsPath = path.join(projectDir, 'res', 'values', 'strings.xml');
    //     expect(configFile.resolveConfigFilePath('project_dir', 'android', 'strings.xml')).toBe(stringsPath);
    // });

    // it('resolveConfigFilePath should return file path', () => {
    //     spyOn(configFile, 'getIOSProjectname').and.returnValue('iospath');
    //     var configPath = path.join('project_dir', 'iospath', 'config.xml');
    //     expect(configFile.resolveConfigFilePath('project_dir', 'ios', 'config.xml')).toBe(configPath);
    // });

    // it('resolveConfigFilePath should return file path', () => {
    //     spyOn(configFile, 'getIOSProjectname').and.returnValue('osxpath');
    //     var configPath = path.join('project_dir', 'osxpath', 'config.xml');
    //     expect(configFile.resolveConfigFilePath('project_dir', 'osx', 'config.xml')).toBe(configPath);
    // });

    // it('resolveConfigFilePath should return file path', () => {
    //     var configPath = path.join('project_dir', 'config.xml');
    //     expect(configFile.resolveConfigFilePath('project_dir', 'ubuntu', 'config.xml')).toBe(configPath);
    // });

    // it('resolveConfigFilePath should return file path', () => {
    //     var file = path.join('res', 'xml');
    //     var configPath = path.join('project_dir', 'app', 'src', 'main', file, 'xml');
    //     expect(configFile.resolveConfigFilePath('project_dir', 'android', file)).toBe(configPath);
    // });

    // it('resolveConfigFilePath should return file path', () => {
    //     var file = 'res/xml';
    //     var configPath = path.join('project_dir', 'app', 'src', 'main', file, 'xml');
    //     expect(configFile.resolveConfigFilePath('project_dir', 'android', file)).toBe(configPath);
    // });
});
