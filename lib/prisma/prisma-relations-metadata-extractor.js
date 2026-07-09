/**
 *
 * Reldens - PrismaRelationsMetadataExtractor
 *
 * Builds the per-model relation metadata ({type: 'many'|'one', model, isList, isOptional, relationName})
 * consumed by ModelsGeneration to emit each Prisma model's relationTypes. The DMMF access is reused from
 * PrismaMetadataLoader.getDmmf(). Cardinality (list vs single) is read from schema.prisma's list markers
 * ("[]") because Prisma 7's pruned _runtimeDataModel no longer exposes field.isList.
 *
 */

const { PrismaMetadataLoader } = require('./prisma-metadata-loader');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class PrismaRelationsMetadataExtractor
{

    constructor(props)
    {
        this.prismaClient = sc.get(props, 'prismaClient', false);
        this.projectRoot = sc.get(props, 'projectRoot', false);
        this.projectPath = sc.get(props, 'projectPath', false);
        this.metadataLoader = new PrismaMetadataLoader({prisma: this.prismaClient});
        this.relationsMetadata = {};
        this.schemaListRelations = {};
    }

    extract()
    {
        if(!this.prismaClient){
            Logger.warning('Missing PrismaClient for relations metadata extraction.');
            return this.relationsMetadata;
        }
        let dmmf = this.metadataLoader.getDmmf();
        if(!dmmf || !dmmf.models){
            Logger.warning('Could not access Prisma DMMF for relations metadata.');
            return this.relationsMetadata;
        }
        this.schemaListRelations = this.resolveSchemaListRelations();
        this.processModels(dmmf.models);
        Logger.info('Extracted relations metadata for '+Object.keys(this.relationsMetadata).length+' models.');
        return this.relationsMetadata;
    }

    processModels(models)
    {
        if(sc.isArray(models)){
            for(let model of models){
                this.processModel(sc.get(model, 'name', ''), model);
            }
            return;
        }
        for(let modelName of Object.keys(models)){
            this.processModel(modelName, models[modelName]);
        }
    }

    processModel(modelName, model)
    {
        if('' === modelName || !sc.isArray(sc.get(model, 'fields', false))){
            return;
        }
        let tableName = modelName.toLowerCase();
        this.relationsMetadata[tableName] = {};
        for(let field of model.fields){
            if('object' !== field.kind){
                continue;
            }
            let isListRelation = true === sc.get(sc.get(this.schemaListRelations, tableName, {}), field.name, false);
            this.relationsMetadata[tableName][field.name] = {
                type: isListRelation ? 'many' : 'one',
                model: field.type,
                isList: isListRelation,
                isOptional: field.isOptional,
                relationName: field.relationName
            };
        }
    }

    resolveSchemaPath()
    {
        let candidatePaths = [];
        if(this.projectRoot){
            candidatePaths.push(FileHandler.joinPaths(this.projectRoot, 'prisma', 'schema.prisma'));
        }
        candidatePaths.push(FileHandler.joinPaths(process.cwd(), 'prisma', 'schema.prisma'));
        if(this.projectPath){
            candidatePaths.push(FileHandler.joinPaths(this.projectPath, 'prisma', 'schema.prisma'));
        }
        for(let candidatePath of candidatePaths){
            if(FileHandler.exists(candidatePath)){
                return candidatePath;
            }
        }
        return false;
    }

    resolveSchemaListRelations()
    {
        let listRelations = {};
        let schemaPath = this.resolveSchemaPath();
        if(!schemaPath){
            Logger.warning('Prisma schema.prisma not found; relation cardinality may fall back to one.');
            return listRelations;
        }
        let schemaContent = FileHandler.readFile(schemaPath);
        if(!schemaContent){
            return listRelations;
        }
        let currentModel = '';
        for(let schemaLine of schemaContent.toString().split('\n')){
            let line = schemaLine.trim();
            let modelMatch = line.match(/^model\s+(\w+)\s*\{/);
            if(modelMatch){
                currentModel = modelMatch[1].toLowerCase();
                listRelations[currentModel] = {};
                continue;
            }
            if('' === currentModel){
                continue;
            }
            if('}' === line){
                currentModel = '';
                continue;
            }
            let listFieldMatch = line.match(/^(\w+)\s+\w+\[\]/);
            if(listFieldMatch){
                listRelations[currentModel][listFieldMatch[1]] = true;
            }
        }
        return listRelations;
    }

}

module.exports.PrismaRelationsMetadataExtractor = PrismaRelationsMetadataExtractor;
