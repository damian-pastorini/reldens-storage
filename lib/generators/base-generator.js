/**
 *
 * Reldens - BaseGenerator
 *
 */

class BaseGenerator
{

    applyReplacements(content, replacements)
    {
        let result = content;
        for(let placeholder of Object.keys(replacements)){
            result = result.replace(new RegExp('{{'+placeholder+'}}','g'), replacements[placeholder]);
        }
        return result;
    }

    addReferenceDeleteRule(props, column)
    {
        let deleteRule = this.mapDeleteRule(column.referencedDeleteRule);
        if(!deleteRule){
            return;
        }
        props.push('onDelete: \''+deleteRule+'\'');
    }

    parseEnumValues(columnType)
    {
        if(!columnType){
            return [];
        }
        let match = columnType.match(/^enum\('(.+)'\)$/i);
        if(!match){
            return [];
        }
        let valuesString = match[1];
        return valuesString.split('\',\'');
    }

    mapDeleteRule(deleteRule)
    {
        if(!deleteRule){
            return '';
        }
        let ruleParts = String(deleteRule).toLowerCase().split(' ');
        let mappedRule = ruleParts.shift();
        for(let rulePart of ruleParts){
            mappedRule += rulePart.charAt(0).toUpperCase()+rulePart.slice(1);
        }
        return mappedRule;
    }

}

module.exports.BaseGenerator = BaseGenerator;
