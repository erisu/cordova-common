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

const fs = require('node:fs');
const { Stats } = fs;
const path = require('node:path');
const fastGlob = require('fast-glob');

// Create mock fs.Stats to simulate file or directory attributes.
function mockFileStats (modified) {
    return {
        __proto__: Stats.prototype,
        dev: 0,
        mode: 32768,
        nlink: 0,
        uid: 0,
        gid: 0,
        rdev: 0,
        blksize: 0,
        ino: 0,
        size: 0,
        blocks: 0,
        atime: null,
        mtime: modified,
        ctime: modified,
        birthtime: null
    };
}
function mockDirStats () {
    return {
        __proto__: Stats.prototype,
        dev: 0,
        mode: 16384,
        nlink: 0,
        uid: 0,
        gid: 0,
        rdev: 0,
        blksize: 0,
        ino: 0,
        size: 0,
        blocks: 0,
        atime: null,
        mtime: null,
        ctime: null,
        birthtime: null
    };
}

const now = new Date();

describe('FileUpdater class', function () {
    function setupUpdatePathSpies (rootDir, srcPath, srcMockStats, hasSrc, targetPath, targetMockStats, hasTarget) {
        const srcPathFull = path.join(rootDir ?? '', srcPath);
        const targetPathFull = path.join(rootDir ?? '', targetPath);

        spyOn(fs, 'statSync').and.callFake(path => {
            if (path === srcPathFull) {
                return srcMockStats;
            }
            if (path === targetPathFull) {
                return targetMockStats;
            }
            return false;
        });

        spyOn(fs, 'existsSync').and.callFake((inputPath) => {
            if (inputPath === srcPathFull) {
                return hasSrc;
            }
            if (inputPath === targetPathFull) {
                return hasTarget;
            }
            return false;
        });

        return {
            rootDir,
            srcPath,
            srcPathFull,
            srcMockStats,
            targetPath,
            targetPathFull,
            targetMockStats
        };
    }

    describe('updatePath method', () => {
        let log;

        beforeEach(() => {
            log = jasmine.createSpy('log');
            spyOn(fs, 'rmSync').and.stub();
            spyOn(fs, 'cpSync').and.stub();
        });

        afterEach(() => {
            log = null;
        });

        it('should throw error when source path is missing (undefined)', () => {
            const FileUpdater = require('../src/FileUpdater.js');
            expect(() => FileUpdater.updatePath())
                .toThrowError('A source path (or null) is required.');
        });

        it('should throw error when source path is not a string', () => {
            const FileUpdater = require('../src/FileUpdater.js');
            expect(() => FileUpdater.updatePath(12345))
                .toThrowError('A source path (or null) is required.');
        });

        it('should not throw error when source path is a string', () => {
            const FileUpdater = require('../src/FileUpdater.js');
            expect(() => FileUpdater.updatePath('/src/fileName'))
                .not.toThrowError('A source path (or null) is required.');
        });

        it('should not throw error when source path is null', () => {
            const FileUpdater = require('../src/FileUpdater.js');
            expect(() => FileUpdater.updatePath(null))
                .not.toThrowError('A source path (or null) is required.');
        });

        it('should throw error when target path is missing (undefined)', () => {
            const FileUpdater = require('../src/FileUpdater.js');
            expect(() => FileUpdater.updatePath(null))
                .toThrowError('A target path is required.');
        });

        it('should throw error when target path is null', () => {
            const FileUpdater = require('../src/FileUpdater.js');
            expect(() => FileUpdater.updatePath(null, null))
                .toThrowError('A target path is required.');
        });

        it('should throw error when target path is not a string', () => {
            const FileUpdater = require('../src/FileUpdater.js');
            expect(() => FileUpdater.updatePath(null, 12345))
                .toThrowError('A target path is required.');
        });

        it('should not throw error when target path is a string', () => {
            const FileUpdater = require('../src/FileUpdater.js');
            expect(() => FileUpdater.updatePath(null, '/target/foobar'))
                .not.toThrowError('A target path is required.');
        });

        it('should throw error when source path is set but missing (without rooDir)', () => {
            const variables = setupUpdatePathSpies(
                undefined, // rootDir
                // Src
                '/src/fileName', // srcPath
                false, // srcMockStats
                false, // hasSrc
                // Target
                '/target/foobar', // targetPath
                mockFileStats(now), // targetMockStats
                true // hasTarget
            );
            const FileUpdater = require('../src/FileUpdater.js');

            expect(
                () => FileUpdater.updatePath(
                    variables.srcPath,
                    variables.targetPath,
                    { rootDir: variables.rootDir }
                )
            ).toThrowError(`Source path does not exist: ${variables.srcPath}`);

            expect(fs.statSync).toHaveBeenCalledWith(variables.targetPathFull);
        });

        it('should throw error when source path is set but missing (with rooDir)', () => {
            const variables = setupUpdatePathSpies(
                '/rootDir', // rootDir
                // Src
                '/src/fileName', // srcPath
                false, // srcMockStats
                false, // hasSrc
                // Target
                '/target/foobar', // targetPath
                mockFileStats(now), // targetMockStats
                true // hasTarget
            );
            const FileUpdater = require('../src/FileUpdater.js');

            expect(
                () => FileUpdater.updatePath(
                    variables.srcPath,
                    variables.targetPath,
                    { rootDir: variables.rootDir }
                )
            ).toThrowError(`Source path does not exist: ${variables.srcPath}`);
            expect(fs.statSync).toHaveBeenCalledWith(variables.targetPathFull);
        });

        it('should not throw error when source path is set and exists (without rooDir)', () => {
            const variables = setupUpdatePathSpies(
                '/rootDir', // rootDir
                // Src
                '/src/fileName', // srcPath
                mockFileStats(now), // srcMockStats
                true, // hasSrc
                // Target
                '/target/foobar', // targetPath
                mockFileStats(now), // targetMockStats
                true // hasTarget
            );
            const FileUpdater = require('../src/FileUpdater.js');

            expect(FileUpdater.updatePath(
                variables.srcPath,
                variables.targetPath,
                { rootDir: variables.rootDir },
                log
            )).toBeTrue();
            expect(fs.statSync).toHaveBeenCalledWith(variables.targetPathFull);
            expect(fs.statSync).toHaveBeenCalledWith(variables.srcPathFull);
        });

        it('should delete target when source is missing', () => {
            const variables = setupUpdatePathSpies(
                '/rootDir', // rootDir
                // Src
                '/src/fileName', // srcPath
                null, // srcMockStats
                true, // hasSrc
                // Target
                '/target/foobar', // targetPath
                mockFileStats(now), // targetMockStats
                true // hasTarget
            );
            const FileUpdater = require('../src/FileUpdater.js');

            expect(FileUpdater.updatePath(
                variables.srcPath,
                variables.targetPath,
                { rootDir: variables.rootDir },
                log
            )).toBeTrue();
            expect(fs.statSync).toHaveBeenCalledWith(variables.targetPathFull);
            expect(fs.statSync).toHaveBeenCalledWith(variables.srcPathFull);
            expect(log).toHaveBeenCalledWith(`delete ${variables.targetPath} (no source)`);
            expect(fs.rmSync).toHaveBeenCalled();
        });

        it('should delete target because it did not match source type', () => {
            const variables = setupUpdatePathSpies(
                '/rootDir', // rootDir
                // Src
                '/src/fileName', // srcPath
                mockDirStats(), // srcMockStats
                true, // hasSrc
                // Target
                '/target/foobar', // targetPath
                mockFileStats(now), // targetMockStats
                true // hasTarget
            );
            const FileUpdater = require('../src/FileUpdater.js');

            expect(FileUpdater.updatePath(
                variables.srcPath,
                variables.targetPath,
                { rootDir: variables.rootDir },
                log
            )).toBeTrue();
            expect(fs.statSync).toHaveBeenCalledWith(variables.targetPathFull);
            expect(fs.statSync).toHaveBeenCalledWith(variables.srcPathFull);
            expect(log).toHaveBeenCalledWith(`delete ${variables.targetPath} (wrong type)`);
            expect(fs.rmSync).toHaveBeenCalled();
        });

        it('should delete target because it did not match source type', () => {
            const variables = setupUpdatePathSpies(
                '/rootDir', // rootDir
                // Src
                '/src/fileName', // srcPath
                mockDirStats(), // srcMockStats
                true, // hasSrc
                // Target
                '/target/foobar', // targetPath
                mockDirStats(), // targetMockStats
                true // hasTarget
            );
            const FileUpdater = require('../src/FileUpdater.js');

            expect(FileUpdater.updatePath(
                variables.srcPath,
                variables.targetPath,
                { rootDir: variables.rootDir },
                log
            )).toBeFalse();

            expect(fs.statSync).toHaveBeenCalledWith(variables.targetPathFull);
            expect(fs.statSync).toHaveBeenCalledWith(variables.srcPathFull);
        });
    });

    describe('updatePaths method', () => {
        let log;

        beforeEach(() => {
            log = jasmine.createSpy('log');
            spyOn(fs, 'rmSync').and.stub();
            spyOn(fs, 'cpSync').and.stub();
        });

        afterEach(() => {
            log = null;
        });

        it('should throw error when dictionary mapping from target paths to source paths is not valid', () => {
            const FileUpdater = require('../src/FileUpdater.js');

            // Undefined
            expect(
                () => FileUpdater.updatePaths(undefined, {}, log)
            ).toThrowError('An object mapping from target paths to source paths is required.');

            // Null
            expect(
                () => FileUpdater.updatePaths(null, {}, log)
            ).toThrowError('An object mapping from target paths to source paths is required.');

            // Number (Not Object)
            expect(
                () => FileUpdater.updatePaths(1234, {}, log)
            ).toThrowError('An object mapping from target paths to source paths is required.');

            // Array
            expect(
                () => FileUpdater.updatePaths([], {}, log)
            ).toThrowError('An object mapping from target paths to source paths is required.');
        });

        it('should process dictionary mapping of target paths to source paths', () => {
            const variables = setupUpdatePathSpies(
                '/rootDir', // rootDir
                // Src
                '/src/fileName', // srcPath
                mockFileStats(now), // srcMockStats
                true, // hasSrc
                // Target
                '/target/foobar', // targetPath
                mockFileStats(now), // targetMockStats
                true // hasTarget
            );
            const FileUpdater = require('../src/FileUpdater.js');

            expect(
                FileUpdater.updatePaths(
                    { [variables.targetPath]: variables.srcPath },
                    { rootDir: variables.rootDir },
                    log
                )
            ).toBeTrue();
        });
    });

    describe('mergeAndUpdateDir method', () => {
        let log;

        beforeEach(() => {
            log = jasmine.createSpy('log');
            spyOn(fs, 'rmSync').and.stub();
            spyOn(fs, 'cpSync').and.stub();
        });

        afterEach(() => {
            log = null;
        });

        it('should throw error when sorce dictionary is invalid', () => {
            const FileUpdater = require('../src/FileUpdater.js');

            // Undefined
            expect(
                () => FileUpdater.mergeAndUpdateDir(undefined, undefined, {}, log)
            ).toThrowError('A source directory path or array of paths is required.');

            // Null
            expect(
                () => FileUpdater.mergeAndUpdateDir(null, undefined, {}, log)
            ).toThrowError('A source directory path or array of paths is required.');

            // Number (Not Object)
            expect(
                () => FileUpdater.mergeAndUpdateDir(1234, undefined, {}, log)
            ).toThrowError('A source directory path or array of paths is required.');

            // Object
            expect(
                () => FileUpdater.mergeAndUpdateDir({}, undefined, {}, log)
            ).toThrowError('A source directory path or array of paths is required.');
        });

        it('should throw error when target dictionary is invalid', () => {
            const FileUpdater = require('../src/FileUpdater.js');

            // Undefined
            expect(
                () => FileUpdater.mergeAndUpdateDir('/src/test/dir', undefined, {}, log)
            ).toThrowError('A target directory path is required.');

            // Null
            expect(
                () => FileUpdater.mergeAndUpdateDir('/src/test/dir', null, {}, log)
            ).toThrowError('A target directory path is required.');

            // Number (Not Object)
            expect(
                () => FileUpdater.mergeAndUpdateDir('/src/test/dir', 1234, {}, log)
            ).toThrowError('A target directory path is required.');

            // Object
            expect(
                () => FileUpdater.mergeAndUpdateDir('/src/test/dir', {}, {}, log)
            ).toThrowError('A target directory path is required.');
        });

        it('should throw error when include flag is invalid', () => {
            const FileUpdater = require('../src/FileUpdater.js');

            // Number
            expect(
                () => FileUpdater.mergeAndUpdateDir('/src/test/dir', '/target/test/dir', { include: 1234 }, log)
            ).toThrowError('Include parameter must be a glob string or array of glob strings.');

            // Boolean
            expect(
                () => FileUpdater.mergeAndUpdateDir('/src/test/dir', '/target/test/dir', { include: true }, log)
            ).toThrowError('Include parameter must be a glob string or array of glob strings.');

            // Object
            expect(
                () => FileUpdater.mergeAndUpdateDir('/src/test/dir', '/target/test/dir', { include: {} }, log)
            ).toThrowError('Include parameter must be a glob string or array of glob strings.');
        });

        it('should not throw error when include flag is string or array of strings', () => {
            const variables = setupUpdatePathSpies(
                '/rootDir', // rootDir
                // Src
                '/src/fileName', // srcPath
                mockDirStats(), // srcMockStats
                true, // hasSrc
                // Target
                '/target/foobar', // targetPath
                mockDirStats(), // targetMockStats
                true // hasTarget
            );
            spyOn(fastGlob, 'sync').and.returnValue([]);
            const FileUpdater = require('../src/FileUpdater.js');

            // String
            expect(
                () => FileUpdater.mergeAndUpdateDir(variables.srcPath, variables.targetPath, { include: '**' }, log)
            ).not.toThrowError('Include parameter must be a glob string or array of glob strings.');

            // Array
            expect(
                () => FileUpdater.mergeAndUpdateDir(variables.srcPath, variables.targetPath, { include: ['**'] }, log)
            ).not.toThrowError('Include parameter must be a glob string or array of glob strings.');
        });

        it('should throw error when exclude flag is invalid', () => {
            const FileUpdater = require('../src/FileUpdater.js');

            // Number
            expect(
                () => FileUpdater.mergeAndUpdateDir('/src/test/dir', '/target/test/dir', { exclude: 1234 }, log)
            ).toThrowError('Exclude parameter must be a glob string or array of glob strings.');

            // Boolean
            expect(
                () => FileUpdater.mergeAndUpdateDir('/src/test/dir', '/target/test/dir', { exclude: true }, log)
            ).toThrowError('Exclude parameter must be a glob string or array of glob strings.');

            // Object
            expect(
                () => FileUpdater.mergeAndUpdateDir('/src/test/dir', '/target/test/dir', { exclude: {} }, log)
            ).toThrowError('Exclude parameter must be a glob string or array of glob strings.');
        });

        it('should not throw error when exclude flag is string or array of strings', () => {
            const variables = setupUpdatePathSpies(
                '', // rootDir
                // Src
                '/src/fileName', // srcPath
                mockDirStats(), // srcMockStats
                true, // hasSrc
                // Target
                '/target/foobar', // targetPath
                mockDirStats(), // targetMockStats
                true // hasTarget
            );
            spyOn(fastGlob, 'sync').and.returnValue([]);
            const FileUpdater = require('../src/FileUpdater.js');

            // String
            expect(
                () => FileUpdater.mergeAndUpdateDir(variables.srcPath, variables.targetPath, { exclude: '**' }, log)
            ).not.toThrowError('Exclude parameter must be a glob string or array of glob strings.');

            // Array
            expect(
                () => FileUpdater.mergeAndUpdateDir(variables.srcPath, variables.targetPath, { exclude: ['**'] }, log)
            ).not.toThrowError('Exclude parameter must be a glob string or array of glob strings.');
        });

        it('should return false when there is nothing to merge and update', () => {
            const variables = setupUpdatePathSpies(
                '', // rootDir
                // Src
                '/src/fileName', // srcPath
                mockDirStats(), // srcMockStats
                true, // hasSrc
                // Target
                '/target/foobar', // targetPath
                mockDirStats(), // targetMockStats
                true // hasTarget
            );
            spyOn(fastGlob, 'sync').and.returnValue([]);
            const FileUpdater = require('../src/FileUpdater.js');

            expect(
                FileUpdater.mergeAndUpdateDir(variables.srcPath, variables.targetPath, { exclude: ['abc'] }, log)
            ).toBeFalse();
        });

        it('should return true when there was something to merge and update', () => {
            const variables = setupUpdatePathSpies(
                '', // rootDir
                // Src
                '/src/fileName', // srcPath
                mockDirStats(), // srcMockStats
                true, // hasSrc
                // Target
                '/target/foobar', // targetPath
                null, // targetMockStats
                false // hasTarget
            );
            spyOn(fastGlob, 'sync').and.returnValue([]);
            const FileUpdater = require('../src/FileUpdater.js');

            expect(
                FileUpdater.mergeAndUpdateDir(variables.srcPath, variables.targetPath, { exclude: ['abc'] }, log)
            ).toBeTrue();
        });
    });
});
