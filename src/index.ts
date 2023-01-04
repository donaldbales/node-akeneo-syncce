import * as bunyan from 'bunyan';
import * as fs from 'fs';
import * as isEqual from 'lodash.isequal';
import * as isEqualWith from 'lodash.isequalwith';
import * as pim1 from 'node-akeneo-api';
// hack to get a second instance of node-akeneo-api.
for (const property in require.cache) {
  if (property.indexOf('node-akeneo-api') !== -1) {
    delete require.cache[property];
    break;
  }
}
import * as pim2 from 'node-akeneo-api';
// end of hack;
import * as path from 'path';
import * as util from 'util';
import Logger from 'bunyan';

const moduleName: string = 'node-akeneo-syncce';

let logger: Logger = bunyan.createLogger({ name: moduleName });
export function setLogger(loggerIn: Logger) {
  logger = loggerIn;
}

async function deltaCatalog(filename: string, keys: any): Promise<number> {
  const methodName: string = 'deltaCatalog';
  logger.info({ moduleName, methodName, filename, keys }, `Starting...`);

  let results: number = 0;

  const pim1Map: Map<string, any> = new Map();
  await pim1.load(path.join(pim1.exportPath, filename), pim1Map, keys);
  const pim2Map: Map<string, any> = new Map();
  await pim2.load(path.join(pim2.exportPath, filename), pim2Map, keys);

  const fileDesc: number = await pim1.open(path.join(pim1.exportPath, 'deltas', filename), 'w');
  for (const key of pim1Map.keys()) {
    const pim1Obj: any = pim1Map.get(key); 
    const pim2Obj: any = pim2Map.get(key); 
    if (!(pim2Obj) ||
        !(same(pim1Obj, pim2Obj))) {
      ++results;
      await pim1.write(fileDesc, `${JSON.stringify(pim1Obj)}\n`);
    }
  }
  await pim1.close(fileDesc);

  return results;
}

async function deltaProducts(filename: string, identifier: string, attributesMap: Map<string, any>, pim1ProductMediaFilesMap: Map<string, any>, pim2ProductMediaFilesMap: Map<string, any>): Promise<number> {
  const methodName: string = 'deltaProducts';
  logger.info({ moduleName, methodName, filename, identifier }, `Starting...`);

  let results: number = 0;

  const pim1Map: Map<string, any> = new Map();
  await pim1.load(path.join(pim1.exportPath, filename), pim1Map, identifier);
  const pim2Map: Map<string, any> = new Map();
  await pim2.load(path.join(pim2.exportPath, filename), pim2Map, identifier);

  const fileDesc: number = await pim1.open(path.join(pim1.exportPath, 'deltas', filename), 'w');
  for (const key of pim1Map.keys()) {
    const pim1Obj: any = pim1Map.get(key); 
    const pim2Obj: any = pim2Map.get(key); 
    if (!(pim2Obj)) {
      logger.info({ moduleName, methodName, identifier: pim1Obj.identifier ? pim1Obj.identifier : pim1Obj.code }, `${pim1Obj.identifier ? 'New Product' : 'New Product Model'}.`);
    }
    if (!(pim2Obj) ||
        !(sameProduct(pim1Obj, pim2Obj, attributesMap, pim1ProductMediaFilesMap, pim2ProductMediaFilesMap))) {
      ++results;
      await pim1.write(fileDesc, `${JSON.stringify(pim1Obj)}\n`);
    }
  }
  await pim1.close(fileDesc);
  return results;
}

function inspect(obj: any, depth: number = 5): string {
  return `${util.inspect(obj, true, depth, false)}`;
}

function same(obj: any, oth: any): boolean {
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

function sameProduct(obj: any, oth: any, attributesMap: Map<string, any>, pim1ProductMediaFilesMap: Map<string, any>, pim2ProductMediaFilesMap: Map<string, any>): boolean {
  const methodName: string = 'sameProduct';
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
    let objValue: any = obj[property] || null;
    let othValue: any = oth[property] || null;
    if (property === 'values') {
      for (const attribute in obj[property]) {
        objValue = obj[property][attribute] || [];
        othValue = oth[property][attribute] || [];
        const type: any = attributesMap.get(attribute)['type'];
        if (type === 'pim_catalog_file' ||
            type === 'pim_catalog_image') {
          let found: number = 0;
          for (const valueObj of objValue) {
            for (const valueOth of othValue) {
              if (valueObj.locale === valueOth.locale &&
                  valueObj.scope === valueOth.scope) {
                ++found;
                const dataObj: any = splitMediaFileData(valueObj.data);
                const dataOth: any = splitMediaFileData(valueOth.data);
                if (dataObj.name !== dataOth.name) {
                  logger.info({ moduleName, methodName, attribute, dataObj, dataOth }, `Failed data test.`);
                  return false;
                } else {
                  const pim1PMFObj: any = pim1ProductMediaFilesMap.get(valueObj.data) || null;
                  const pim2PMFObj: any = pim2ProductMediaFilesMap.get(valueOth.data) || null;
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
        } else {
          if (!(same(objValue, othValue))) {
            logger.info({ moduleName, methodName, attribute }, `Failed attribute test.`);
            return false;
          }
        }
      }
    } else {
      if (!(same(objValue, othValue))) {
        logger.info({ moduleName, methodName, property }, `Failed property test.`);
        return false;
      }
    }
  }

  return true;
}

function splitMediaFileData(data: string): any {
  const methodName: string = 'splitMediaFileData';
  // the underscore is used to separate the guid from the actual filename
  const results: any = {};
  const firstUnderscoreAt: number = data.indexOf('_');
  if (firstUnderscoreAt !== -1) {
    results.path = data.slice(0, firstUnderscoreAt);
    results.name = data.slice(firstUnderscoreAt + 1, data.length);
  } else {
    results.path = '';
    results.name = data;
  }

  return results;
}

async function compareNestedLoops(): Promise<any> {
  const methodName: string = 'compareNestedLoops';
  pim1.setLogger(logger);

  pim1.setBaseUrl((process.env.PIM1_AKENEO_BASE_URL as string) || '');
  pim1.setClientId((process.env.PIM1_AKENEO_CLIENT_ID as string) || '');
  pim1.setExportPath((process.env.PIM1_AKENEO_EXPORT_PATH as string) || '.');
  pim1.setPassword((process.env.PIM1_AKENEO_PASSWORD as string) || '');
  pim1.setSecret((process.env.PIM1_AKENEO_SECRET as string) || '');
  pim1.setUsername((process.env.PIM1_AKENEO_USERNAME as string) || '');

  pim2.setLogger(logger);

  pim2.setBaseUrl((process.env.PIM2_AKENEO_BASE_URL as string) || '');
  pim2.setClientId((process.env.PIM2_AKENEO_CLIENT_ID as string) || '');
  pim2.setExportPath((process.env.PIM2_AKENEO_EXPORT_PATH as string) || '.');
  pim2.setPassword((process.env.PIM2_AKENEO_PASSWORD as string) || '');
  pim2.setSecret((process.env.PIM2_AKENEO_SECRET as string) || '');
  pim2.setUsername((process.env.PIM2_AKENEO_USERNAME as string) || '');

  let started: Date = new Date(); 
  await pim1.exportProducts();
  const pim1Map: Map<string, any> = new Map();
  await pim1.load(path.join(pim1.exportPath, pim1.filenameProducts), pim1Map, 'identifier');
  let stopped: Date = new Date();
  let duration: string = ((stopped.getTime() - started.getTime()) / 1000).toLocaleString('en-US');
  logger.info({ moduleName, methodName, op: 'get all', started, stopped, duration },`in seconds`);

  started = new Date();
  const pim2Map: Map<string, any> = new Map();
  for (const key of pim1Map.keys()) {
    const results: any = await pim2.get(pim2.apiUrlProducts(key));
    if (results[0]) {
      pim2Map.set(results[0].identifier, results[0]);
    }
  }
  stopped = new Date();
  duration = ((stopped.getTime() - started.getTime()) / 1000).toLocaleString('en-US');
  logger.info({ moduleName, methodName, op: 'nested loops', started, stopped, duration },`in seconds`);
}

async function main(...args: string[]): Promise<any> {
  const methodName: string = 'main';
  const loggerLevel: any = (process.env.LOG_LEVEL as string) || 'info';
  logger.level(loggerLevel);
  const started: Date = new Date(); 
  logger.info({ moduleName, methodName, started },` Starting...`);

  pim1.setLogger(logger);

  pim1.setBaseUrl((process.env.PIM1_AKENEO_BASE_URL as string) || '');
  pim1.setClientId((process.env.PIM1_AKENEO_CLIENT_ID as string) || '');
  pim1.setExportPath((process.env.PIM1_AKENEO_EXPORT_PATH as string) || '.');
  pim1.setPassword((process.env.PIM1_AKENEO_PASSWORD as string) || '');
  pim1.setSecret((process.env.PIM1_AKENEO_SECRET as string) || '');
  pim1.setUsername((process.env.PIM1_AKENEO_USERNAME as string) || '');

  pim2.setLogger(logger);

  pim2.setBaseUrl((process.env.PIM2_AKENEO_BASE_URL as string) || '');
  pim2.setClientId((process.env.PIM2_AKENEO_CLIENT_ID as string) || '');
  pim2.setExportPath((process.env.PIM2_AKENEO_EXPORT_PATH as string) || '.');
  pim2.setPassword((process.env.PIM2_AKENEO_PASSWORD as string) || '');
  pim2.setSecret((process.env.PIM2_AKENEO_SECRET as string) || '');
  pim2.setUsername((process.env.PIM2_AKENEO_USERNAME as string) || '');

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

  let results: any = null;

  results = await Promise.all([
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

  results = await Promise.all([
    pim1.exportProducts(),
    pim2.exportProducts()
  ]);

  console.log('\n');

  await pim1.mkdir(path.join(pim1.exportPath, 'deltas'));
  await pim1.unlink(path.join(pim1.exportPath, 'deltas', pim1.filenameProductMediaFiles));
  await pim1.symlink(path.join(process.cwd(), pim1.exportPath, pim1.filenameProductMediaFiles),
                     path.join(process.cwd(), pim1.exportPath, 'deltas', pim1.filenameProductMediaFiles));

  const pim1ProductMediaFilesMap: Map<string, any> = new Map();
  await pim1.load(path.join(pim1.exportPath, pim1.filenameProductMediaFiles), pim1ProductMediaFilesMap, 'fromData');

  const pim2ProductMediaFilesMap: Map<string, any> = new Map();
  await pim2.load(path.join(pim2.exportPath, pim2.filenameProductMediaFiles), pim2ProductMediaFilesMap, 'fromData');
  if (pim2ProductMediaFilesMap.size === 0) {
    for (const value of pim1ProductMediaFilesMap.values()) {
      delete value.toData;
      delete value.toHref;
    }
  }

  const attributesMap: Map<string, any> = new Map();
  await pim1.load(path.join(pim1.exportPath, pim1.filenameAttributes), attributesMap, 'code');

  const channels: number = await deltaCatalog(pim1.filenameChannels, 'code');
  const associationTypes: number = await deltaCatalog(pim1.filenameAssociationTypes, 'code');
  const attributeGroups: number = await deltaCatalog(pim1.filenameAttributeGroups, 'code');
  const attributes: number = await deltaCatalog(pim1.filenameAttributes, 'code');
  const attributeOptions: number = await deltaCatalog(pim1.filenameAttributeOptions, ['attribute', 'code']);
  // force errors
  // const attributeOptions: number = await deltaCatalog(pim1.filenameAttributeOptions, 'code');
  const categories: number = await deltaCatalog(pim1.filenameCategories, 'code');
  const families: number = await deltaCatalog(pim1.filenameFamilies, 'code');
  const familyVariants: number = await deltaCatalog(pim1.filenameFamilyVariants, 'code');
  const productModels: number = await deltaProducts(pim1.filenameProductModels, 'code', attributesMap, pim1ProductMediaFilesMap, pim2ProductMediaFilesMap);
  const products: number = await deltaProducts(pim1.filenameProducts, 'identifier', attributesMap, pim1ProductMediaFilesMap, pim2ProductMediaFilesMap);

  for (const char of ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f']) {
    await pim1.unlink(path.join(pim1.exportPath, 'deltas', char));
    await pim1.symlink(path.join(process.cwd(), pim1.exportPath, char),
                       path.join(process.cwd(), pim1.exportPath, 'deltas', char));
  }

  const fileDesc: number = await pim1.open(path.join(pim1.exportPath, pim1.filenameProductMediaFiles), 'w');
  for (const value of pim1ProductMediaFilesMap.values()) {
    await pim1.write(fileDesc, `${JSON.stringify(value)}\n`);
  }
  await pim1.close(fileDesc);

  console.log('\n');

  pim2.setExportPath(path.join(pim1.exportPath, 'deltas'));

  results = channels ? await pim2.importChannels() : null;
  results = associationTypes ? await pim2.importAssociationTypes() : null;
  results = attributeGroups ? await pim2.importAttributeGroups() : null;
  results = attributes ? await pim2.importAttributes() : null;
  results = attributeOptions ? await pim2.importAttributeOptions() : null;
  results = categories ? await pim2.importCategories() : null;
  results = families ? await pim2.importFamilies() : null;
  results = familyVariants ? await pim2.importFamilyVariants() : null;
  results = productModels ? await pim2.importProductModels() : null;
  results = products ? await pim2.importProducts() : null;

  const stopped: Date = new Date();
  const duration: string = ((stopped.getTime() - started.getTime()) / 1000).toLocaleString('en-US');
  const heapUsed: string = process.memoryUsage().heapUsed.toLocaleString('en-US');
  logger.info({ moduleName, methodName, heapUsed, started, stopped, duration },`in seconds`);
}

// Start the program
if (require.main === module) {
  main();
}
