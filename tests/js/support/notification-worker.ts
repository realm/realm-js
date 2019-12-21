const Realm = require('../../..');

const schema = [{
    name: 'Event',
    properties: {
        type: 'string',
        path: 'string',
        insertions: 'int[]',
        deletions: 'int[]',
        newModifications: 'int[]',
        oldModifications: 'int[]'
    }
}];

async function logEvent(event: string, path: string, rows: any={}) {
    if (!process.env.communication_realm_path) {
        return;
    }
    const propertyToCheck = 'int';
    const realm = await Realm.open({path: process.env.communication_realm_path, schema: schema})
    realm.write(() => {
        realm.create('Event', {
            type: event,
            path: path,
            insertions: (rows.insertions || []).map(obj => obj[propertyToCheck]),
            deletions: (rows.deletions || []).map(obj => obj[propertyToCheck]),
            newModifications: (rows.newModifications || []).map(obj => obj[propertyToCheck]),
            oldModifications: (rows.oldModifications || []).map(obj => obj[propertyToCheck]),
        });
    });
}

export function onavailable(path) {
    return logEvent('available', path);
}

export function onchange(changes) {
    let rows = changes.changes.IntObject;
    return logEvent('change', changes.path, rows);
}

export function ondelete(path) {
    return logEvent('delete', path);
}
