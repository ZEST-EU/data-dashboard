// Turn a raw Orion keyValues entity into the shape the UI needs.
// A DeviceMeasurement carries exactly ONE of these typed attributes, and which
// one it is tells us how to chart it.

const ID_PREFIX = 'urn:ngsi-ld:DeviceMeasurement:';

const ATTR_KIND = {
    numValue: 'number', // -> line chart
    boolValue: 'boolean', // -> step chart (0/1)
    textValue: 'text' // -> latest-values table
};

/**
 * @param {object} entity Orion keyValues entity, e.g.
 *   { id: 'urn:ngsi-ld:DeviceMeasurement:BioPC.ProcessVariables.T3_PV:01', type, numValue: 37.2 }
 * @returns parsed measurement, or one with attr=null if no typed attribute is present.
 */
export function parseEntity(entity) {
    const id = entity.id;

    // Which typed attribute does this entity carry?
    let attr = null;
    let kind = null;
    for (const [name, k] of Object.entries(ATTR_KIND)) {
        if (entity[name] !== undefined) {
            attr = name;
            kind = k;
            break;
        }
    }

    // Strip the URN prefix and the trailing ":NN(N)" instance suffix.
    let name = id.startsWith(ID_PREFIX) ? id.slice(ID_PREFIX.length) : id;
    name = name.replace(/:\d+$/, '');

    // BioPC ids look like "BioPC.<Category>.<leaf...>"; group by <Category>.
    // Mock ids are just "<Name>" -> fall back to a single "Measurements" group.
    let category = 'Measurements';
    let label = name;
    const parts = name.split('.');
    if (parts.length >= 3 && parts[0] === 'BioPC') {
        category = parts[1];
        label = parts.slice(2).join('.');
    } else if (parts.length >= 2) {
        category = parts[0];
        label = parts.slice(1).join('.');
    }

    return {
        id,
        attr, // 'numValue' | 'boolValue' | 'textValue' | null
        kind, // 'number' | 'boolean' | 'text' | null
        category,
        label,
        fullName: name,
        currentValue: attr ? entity[attr] : undefined,
        unit: entity.unit // biopc entities usually have none; handled gracefully
    };
}

/** Group parsed measurements by category, sorted alphabetically. */
export function groupByCategory(measurements) {
    const groups = new Map();
    for (const m of measurements) {
        if (!groups.has(m.category)) groups.set(m.category, []);
        groups.get(m.category).push(m);
    }
    return [...groups.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([category, items]) => ({
            category,
            items: items.sort((a, b) => a.label.localeCompare(b.label))
        }));
}
