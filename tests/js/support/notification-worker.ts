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

    const realm = await Realm.open({path: process.env.communication_realm_path, schema: schema})
    realm.write(() => {
        realm.create('Event', {
            type: event,
            path: path,
            insertions: rows.insertions,
            deletions: rows.deletions,
            newModifications: rows.newModifications,
            oldModifications: rows.oldModifications,
        });
    });
}

export function onavailable(path) {
    return logEvent('available', path);
}

/*Realm.Sync.ChangeEvent*/
export function onchange(changes) {
    const objectToTrack = "IntObject";
    const propertyToTrack = 'int';
    let rows = changes.changes[objectToTrack];

    let insertions = (rows.insertions || []).map(obj => obj[propertyToTrack]);
    let deletions = (rows.deletions || []).map(obj => obj[propertyToTrack]);
    let newModifications = (rows.newModifications || []).map(obj => obj[propertyToTrack]);
    let oldModifications = (rows.oldModifications || []).map(obj => obj[propertyToTrack]);
    let copied = Object.assign({}, {insertions, deletions, newModifications, oldModifications});
    return logEvent('change', changes.path, copied);
}

export function ondelete(path) {
    return logEvent('delete', path);
}
