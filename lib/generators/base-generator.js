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

}

module.exports.BaseGenerator = BaseGenerator;
