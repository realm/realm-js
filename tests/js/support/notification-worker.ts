const Realm = require('../../..');

const schema = [{
    name: 'Event',
    properties: {
        type: 'string',
        path: 'string',
        insertions: 'int[]',
        deletions: 'int[]',
        modifications: 'int[]'
    }
}];

async function logEvent(event: string, path: string, rows: any={}) {
    if (!process.env.communication_realm_path) {
        return;
    }
    const realm = await Realm.open({path: process.env.communication_realm_path, schema: schema})
    realm.write(() => {
        realm.create('Event', {
            type: event,
            path: path,
            insertions: rows.insertions || [],
            deletions: rows.deletions || [],
            modifications: rows.modifications || [],
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
