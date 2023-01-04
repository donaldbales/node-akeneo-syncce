"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const bunyan = require("bunyan");
const pim1 = require("node-akeneo-api");
// hack to get a second instance of node-akeneo-api.
for (const property in require.cache) {
    if (property.indexOf('node-akeneo-api') !== -1) {
        delete require.cache[property];
        break;
    }
}
const pim2 = require("node-akeneo-api");
// end of hack;
const path = require("path");
const util = require("util");
const moduleName = 'node-akeneo-syncce';
let logger = bunyan.createLogger({ name: moduleName });
function setLogger(loggerIn) {
    logger = loggerIn;
}
exports.setLogger = setLogger;
function deltaCatalog(filename, keys) {
    return __awaiter(this, void 0, void 0, function* () {
        const methodName = 'deltaCatalog';
        logger.info({ moduleName, methodName, filename, keys }, `Starting...`);
        let results = 0;
        const pim1Map = new Map();
        yield pim1.load(path.join(pim1.exportPath, filename), pim1Map, keys);
        const pim2Map = new Map();
        yield pim2.load(path.join(pim2.exportPath, filename), pim2Map, keys);
        const fileDesc = yield pim1.open(path.join(pim1.exportPath, 'deltas', filename), 'w');
        for (const key of pim1Map.keys()) {
            const pim1Obj = pim1Map.get(key);
            const pim2Obj = pim2Map.get(key);
            if (!(pim2Obj) ||
                !(same(pim1Obj, pim2Obj))) {
                ++results;
                yield pim1.write(fileDesc, `${JSON.stringify(pim1Obj)}\n`);
            }
        }
        yield pim1.close(fileDesc);
        return results;
    });
}
function deltaProducts(filename, identifier, attributesMap, pim1ProductMediaFilesMap, pim2ProductMediaFilesMap) {
    return __awaiter(this, void 0, void 0, function* () {
        const methodName = 'deltaProducts';
        logger.info({ moduleName, methodName, filename, identifier }, `Starting...`);
        let results = 0;
        const pim1Map = new Map();
        yield pim1.load(path.join(pim1.exportPath, filename), pim1Map, identifier);
        const pim2Map = new Map();
        yield pim2.load(path.join(pim2.exportPath, filename), pim2Map, identifier);
        const fileDesc = yield pim1.open(path.join(pim1.exportPath, 'deltas', filename), 'w');
        for (const key of pim1Map.keys()) {
            const pim1Obj = pim1Map.get(key);
            const pim2Obj = pim2Map.get(key);
            if (!(pim2Obj)) {
                logger.info({ moduleName, methodName, identifier: pim1Obj.identifier ? pim1Obj.identifier : pim1Obj.code }, `${pim1Obj.identifier ? 'New Product' : 'New Product Model'}.`);
            }
            if (!(pim2Obj) ||
                !(sameProduct(pim1Obj, pim2Obj, attributesMap, pim1ProductMediaFilesMap, pim2ProductMediaFilesMap))) {
                ++results;
                yield pim1.write(fileDesc, `${JSON.stringify(pim1Obj)}\n`);
            }
        }
        yield pim1.close(fileDesc);
        return results;
    });
}
function inspect(obj, depth = 5) {
    return `${util.inspect(obj, true, depth, false)}`;
}
function same(obj, oth) {
    if (obj &&
        obj['updated']) {
        delete obj['updated'];
    }
    if (oth &&
        oth['updated']) {
        delete oth['updated'];
    }
    return Array.from(JSON.stringify(obj)).sort().toString() === Array.from(JSON.stringify(oth)).sort().toString();
}
function sameProduct(obj, oth, attributesMap, pim1ProductMediaFilesMap, pim2ProductMediaFilesMap) {
    const methodName = 'sameProduct';
    if (obj &&
        obj['created']) {
        delete obj['created'];
    }
    if (oth &&
        oth['created']) {
        delete oth['created'];
    }
    if (obj &&
        obj['updated']) {
        delete obj['updated'];
    }
    if (oth &&
        oth['updated']) {
        delete oth['updated'];
    }
    // get the destination host and api
    //let toHrefHostAndApi: string = '';
    //for (const value of pim2ProductMediaFilesMap.values()) {
    //  toHrefHostAndApi = value.fromHref.replace(value.fromData, '').replace('/download', '');
    //  break;
    //}
    for (const property in obj) {
        let objValue = obj[property] || null;
        let othValue = oth[property] || null;
        if (property === 'values') {
            for (const attribute in obj[property]) {
                objValue = obj[property][attribute] || [];
                othValue = oth[property][attribute] || [];
                const type = attributesMap.get(attribute)['type'];
                if (type === 'pim_catalog_file' ||
                    type === 'pim_catalog_image') {
                    let found = 0;
                    for (const valueObj of objValue) {
                        for (const valueOth of othValue) {
                            if (valueObj.locale === valueOth.locale &&
                                valueObj.scope === valueOth.scope) {
                                ++found;
                                const dataObj = splitMediaFileData(valueObj.data);
                                const dataOth = splitMediaFileData(valueOth.data);
                                if (dataObj.name !== dataOth.name) {
                                    logger.info({ moduleName, methodName, attribute, dataObj, dataOth }, `Failed data test.`);
                                    return false;
                                }
                                else {
                                    const pim1PMFObj = pim1ProductMediaFilesMap.get(valueObj.data) || null;
                                    const pim2PMFObj = pim2ProductMediaFilesMap.get(valueOth.data) || null;
                                    if (pim1PMFObj &&
                                        pim2PMFObj) {
                                        if (!(pim1PMFObj.toData) ||
                                            !(pim1PMFObj.toHref)) {
                                            pim1PMFObj.toData = pim2PMFObj.fromData;
                                            pim1PMFObj.toHref = `${pim2.baseUrl}${pim2.apiUrlProductMediaFiles()}${pim2PMFObj.fromData}/download`;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (objValue.length !== found) {
                        logger.info({ moduleName, methodName, attribute }, `Failed found test.`);
                        return false;
                    }
                }
                else {
                    if (!(same(objValue, othValue))) {
                        logger.info({ moduleName, methodName, attribute }, `Failed attribute test.`);
                        return false;
                    }
                }
            }
        }
        else {
            if (!(same(objValue, othValue))) {
                logger.info({ moduleName, methodName, property }, `Failed property test.`);
                return false;
            }
        }
    }
    return true;
}
function splitMediaFileData(data) {
    const methodName = 'splitMediaFileData';
    // the underscore is used to separate the guid from the actual filename
    const results = {};
    const firstUnderscoreAt = data.indexOf('_');
    if (firstUnderscoreAt !== -1) {
        results.path = data.slice(0, firstUnderscoreAt);
        results.name = data.slice(firstUnderscoreAt + 1, data.length);
    }
    else {
        results.path = '';
        results.name = data;
    }
    return results;
}
function compareNestedLoops() {
    return __awaiter(this, void 0, void 0, function* () {
        const methodName = 'compareNestedLoops';
        pim1.setLogger(logger);
        pim1.setBaseUrl(process.env.PIM1_AKENEO_BASE_URL || '');
        pim1.setClientId(process.env.PIM1_AKENEO_CLIENT_ID || '');
        pim1.setExportPath(process.env.PIM1_AKENEO_EXPORT_PATH || '.');
        pim1.setPassword(process.env.PIM1_AKENEO_PASSWORD || '');
        pim1.setSecret(process.env.PIM1_AKENEO_SECRET || '');
        pim1.setUsername(process.env.PIM1_AKENEO_USERNAME || '');
        pim2.setLogger(logger);
        pim2.setBaseUrl(process.env.PIM2_AKENEO_BASE_URL || '');
        pim2.setClientId(process.env.PIM2_AKENEO_CLIENT_ID || '');
        pim2.setExportPath(process.env.PIM2_AKENEO_EXPORT_PATH || '.');
        pim2.setPassword(process.env.PIM2_AKENEO_PASSWORD || '');
        pim2.setSecret(process.env.PIM2_AKENEO_SECRET || '');
        pim2.setUsername(process.env.PIM2_AKENEO_USERNAME || '');
        let started = new Date();
        yield pim1.exportProducts();
        const pim1Map = new Map();
        yield pim1.load(path.join(pim1.exportPath, pim1.filenameProducts), pim1Map, 'identifier');
        let stopped = new Date();
        let duration = ((stopped.getTime() - started.getTime()) / 1000).toLocaleString('en-US');
        logger.info({ moduleName, methodName, op: 'get all', started, stopped, duration }, `in seconds`);
        started = new Date();
        const pim2Map = new Map();
        for (const key of pim1Map.keys()) {
            const results = yield pim2.get(pim2.apiUrlProducts(key));
            if (results[0]) {
                pim2Map.set(results[0].identifier, results[0]);
            }
        }
        stopped = new Date();
        duration = ((stopped.getTime() - started.getTime()) / 1000).toLocaleString('en-US');
        logger.info({ moduleName, methodName, op: 'nested loops', started, stopped, duration }, `in seconds`);
    });
}
function main(...args) {
    return __awaiter(this, void 0, void 0, function* () {
        const methodName = 'main';
        const loggerLevel = process.env.LOG_LEVEL || 'info';
        logger.level(loggerLevel);
        const started = new Date();
        logger.info({ moduleName, methodName, started }, ` Starting...`);
        pim1.setLogger(logger);
        pim1.setBaseUrl(process.env.PIM1_AKENEO_BASE_URL || '');
        pim1.setClientId(process.env.PIM1_AKENEO_CLIENT_ID || '');
        pim1.setExportPath(process.env.PIM1_AKENEO_EXPORT_PATH || '.');
        pim1.setPassword(process.env.PIM1_AKENEO_PASSWORD || '');
        pim1.setSecret(process.env.PIM1_AKENEO_SECRET || '');
        pim1.setUsername(process.env.PIM1_AKENEO_USERNAME || '');
        pim2.setLogger(logger);
        pim2.setBaseUrl(process.env.PIM2_AKENEO_BASE_URL || '');
        pim2.setClientId(process.env.PIM2_AKENEO_CLIENT_ID || '');
        pim2.setExportPath(process.env.PIM2_AKENEO_EXPORT_PATH || '.');
        pim2.setPassword(process.env.PIM2_AKENEO_PASSWORD || '');
        pim2.setSecret(process.env.PIM2_AKENEO_SECRET || '');
        pim2.setUsername(process.env.PIM2_AKENEO_USERNAME || '');
        pim1.unlink(path.join(pim1.exportPath, pim1.filenameAssociationTypes));
        pim1.unlink(path.join(pim1.exportPath, pim1.filenameAttributeGroups));
        pim1.unlink(path.join(pim1.exportPath, pim1.filenameAttributeOptions));
        pim1.unlink(path.join(pim1.exportPath, pim1.filenameAttributes));
        pim1.unlink(path.join(pim1.exportPath, pim1.filenameCategories));
        pim1.unlink(path.join(pim1.exportPath, pim1.filenameChannels));
        pim1.unlink(path.join(pim1.exportPath, pim1.filenameFamilies));
        pim1.unlink(path.join(pim1.exportPath, pim1.filenameFamilyVariants));
        pim1.unlink(path.join(pim1.exportPath, pim1.filenameProductModels));
        pim1.unlink(path.join(pim1.exportPath, pim1.filenameProducts));
        pim2.unlink(path.join(pim2.exportPath, pim2.filenameAssociationTypes));
        pim2.unlink(path.join(pim2.exportPath, pim2.filenameAttributeGroups));
        pim2.unlink(path.join(pim2.exportPath, pim2.filenameAttributeOptions));
        pim2.unlink(path.join(pim2.exportPath, pim2.filenameAttributes));
        pim2.unlink(path.join(pim2.exportPath, pim2.filenameCategories));
        pim2.unlink(path.join(pim2.exportPath, pim2.filenameChannels));
        pim2.unlink(path.join(pim2.exportPath, pim2.filenameFamilies));
        pim2.unlink(path.join(pim2.exportPath, pim2.filenameFamilyVariants));
        pim2.unlink(path.join(pim2.exportPath, pim2.filenameProductModels));
        pim2.unlink(path.join(pim2.exportPath, pim2.filenameProducts));
        let results = null;
        results = yield Promise.all([
            pim1.exportAssociationTypes(),
            pim1.exportAttributeGroups(),
            pim1.exportAttributes(),
            pim1.exportCategories(),
            pim1.exportChannels(),
            pim1.exportFamilies(),
            pim1.exportProductModels(),
            pim2.exportAssociationTypes(),
            pim2.exportAttributeGroups(),
            pim2.exportAttributes(),
            pim2.exportCategories(),
            pim2.exportChannels(),
            pim2.exportFamilies(),
            pim2.exportProductModels()
        ]);
        results = yield Promise.all([
            pim1.exportProducts(),
            pim2.exportProducts()
        ]);
        console.log('\n');
        yield pim1.mkdir(path.join(pim1.exportPath, 'deltas'));
        yield pim1.unlink(path.join(pim1.exportPath, 'deltas', pim1.filenameProductMediaFiles));
        yield pim1.symlink(path.join(process.cwd(), pim1.exportPath, pim1.filenameProductMediaFiles), path.join(process.cwd(), pim1.exportPath, 'deltas', pim1.filenameProductMediaFiles));
        const pim1ProductMediaFilesMap = new Map();
        yield pim1.load(path.join(pim1.exportPath, pim1.filenameProductMediaFiles), pim1ProductMediaFilesMap, 'fromData');
        const pim2ProductMediaFilesMap = new Map();
        yield pim2.load(path.join(pim2.exportPath, pim2.filenameProductMediaFiles), pim2ProductMediaFilesMap, 'fromData');
        if (pim2ProductMediaFilesMap.size === 0) {
            for (const value of pim1ProductMediaFilesMap.values()) {
                delete value.toData;
                delete value.toHref;
            }
        }
        const attributesMap = new Map();
        yield pim1.load(path.join(pim1.exportPath, pim1.filenameAttributes), attributesMap, 'code');
        const channels = yield deltaCatalog(pim1.filenameChannels, 'code');
        const associationTypes = yield deltaCatalog(pim1.filenameAssociationTypes, 'code');
        const attributeGroups = yield deltaCatalog(pim1.filenameAttributeGroups, 'code');
        const attributes = yield deltaCatalog(pim1.filenameAttributes, 'code');
        const attributeOptions = yield deltaCatalog(pim1.filenameAttributeOptions, ['attribute', 'code']);
        // force errors
        // const attributeOptions: number = await deltaCatalog(pim1.filenameAttributeOptions, 'code');
        const categories = yield deltaCatalog(pim1.filenameCategories, 'code');
        const families = yield deltaCatalog(pim1.filenameFamilies, 'code');
        const familyVariants = yield deltaCatalog(pim1.filenameFamilyVariants, 'code');
        const productModels = yield deltaProducts(pim1.filenameProductModels, 'code', attributesMap, pim1ProductMediaFilesMap, pim2ProductMediaFilesMap);
        const products = yield deltaProducts(pim1.filenameProducts, 'identifier', attributesMap, pim1ProductMediaFilesMap, pim2ProductMediaFilesMap);
        for (const char of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f']) {
            yield pim1.unlink(path.join(pim1.exportPath, 'deltas', char));
            yield pim1.symlink(path.join(process.cwd(), pim1.exportPath, char), path.join(process.cwd(), pim1.exportPath, 'deltas', char));
        }
        const fileDesc = yield pim1.open(path.join(pim1.exportPath, pim1.filenameProductMediaFiles), 'w');
        for (const value of pim1ProductMediaFilesMap.values()) {
            yield pim1.write(fileDesc, `${JSON.stringify(value)}\n`);
        }
        yield pim1.close(fileDesc);
        console.log('\n');
        pim2.setExportPath(path.join(pim1.exportPath, 'deltas'));
        results = channels ? yield pim2.importChannels() : null;
        results = associationTypes ? yield pim2.importAssociationTypes() : null;
        results = attributeGroups ? yield pim2.importAttributeGroups() : null;
        results = attributes ? yield pim2.importAttributes() : null;
        results = attributeOptions ? yield pim2.importAttributeOptions() : null;
        results = categories ? yield pim2.importCategories() : null;
        results = families ? yield pim2.importFamilies() : null;
        results = familyVariants ? yield pim2.importFamilyVariants() : null;
        results = productModels ? yield pim2.importProductModels() : null;
        results = products ? yield pim2.importProducts() : null;
        const stopped = new Date();
        const duration = ((stopped.getTime() - started.getTime()) / 1000).toLocaleString('en-US');
        const heapUsed = process.memoryUsage().heapUsed.toLocaleString('en-US');
        logger.info({ moduleName, methodName, heapUsed, started, stopped, duration }, `in seconds`);
    });
}
// Start the program
if (require.main === module) {
    main();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsaUNBQWlDO0FBSWpDLHdDQUF3QztBQUN4QyxvREFBb0Q7QUFDcEQsS0FBSyxNQUFNLFFBQVEsSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFO0lBQ3BDLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO1FBQzlDLE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMvQixNQUFNO0tBQ1A7Q0FDRjtBQUNELHdDQUF3QztBQUN4QyxlQUFlO0FBQ2YsNkJBQTZCO0FBQzdCLDZCQUE2QjtBQUc3QixNQUFNLFVBQVUsR0FBVyxvQkFBb0IsQ0FBQztBQUVoRCxJQUFJLE1BQU0sR0FBVyxNQUFNLENBQUMsWUFBWSxDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7QUFDL0QsbUJBQTBCLFFBQWdCO0lBQ3hDLE1BQU0sR0FBRyxRQUFRLENBQUM7QUFDcEIsQ0FBQztBQUZELDhCQUVDO0FBRUQsc0JBQTRCLFFBQWdCLEVBQUUsSUFBUzs7UUFDckQsTUFBTSxVQUFVLEdBQVcsY0FBYyxDQUFDO1FBQzFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUV2RSxJQUFJLE9BQU8sR0FBVyxDQUFDLENBQUM7UUFFeEIsTUFBTSxPQUFPLEdBQXFCLElBQUksR0FBRyxFQUFFLENBQUM7UUFDNUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDckUsTUFBTSxPQUFPLEdBQXFCLElB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