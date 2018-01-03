////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

'use strict';

import React from 'react';
import { ListView as BaseListView } from 'react-native';

function hashObjects(array) {
    let hash = Object.create(null);
    for (let i = 0, len = array.length; i < len; i++) {
        hash[array[i]] = true;
    }
    return hash;
}

class ListViewDataSource extends BaseListView.DataSource {
    cloneWithRowsAndSections(inputData, sectionIds, rowIds) {
        let data = {};

        for (let sectionId in inputData) {
            let items = inputData[sectionId];
            let copy;

            // Realm Results and List objects have a snapshot() method.
            if (typeof items.snapshot == 'function') {
                copy = items.snapshot();
            } else if (Array.isArray(items)) {
                copy = items.slice();
            } else {
                copy = Object.assign({}, items);
            }

            data[sectionId] = copy;
        }

        if (!sectionIds) {
            sectionIds = Object.keys(data);
        }
        if (!rowIds) {
            rowIds = sectionIds.map((sectionId) => {
                let items = data[sectionId];
                if (typeof items.snapshot != 'function') {
                    return Object.keys(items);
                }

                // Efficiently get the keys of the Realm collection, since they're never sparse.
                let count = items.length;
                let indexes = new Array(count);
                for (let i = 0; i < count; i++) {
                    indexes[i] = i;
                }
                return indexes;
            });
        }

        // Copy this object with the same parameters initially passed into the constructor.
        let newSource = new this.constructor({
            getRowData: this._getRowData,
            getSectionHeaderData: this._getSectionHeaderData,
            rowHasChanged: this._rowHasChanged,
            sectionHeaderHasChanged: this._sectionHeaderHasChanged,
        });

        newSource._cachedRowCount = rowIds.reduce((n, a) => n + a.length, 0);
        newSource._dataBlob = data;
        newSource.sectionIdentities = sectionIds;
        newSource.rowIdentities = rowIds;

        let prevSectionIds = this.sectionIdentities;
        let prevRowIds = this.rowIdentities;
        let prevRowHash = {};
        for (let i = 0, len = prevRowIds.length; i < len; i++) {
            prevRowHash[prevSectionIds[i]] = hashObjects(prevRowIds[i]);
        }

        // These properties allow lazily calculating if rows and section headers should update.
        newSource._prevDataBlob = this._dataBlob;
        newSource._prevSectionHash = hashObjects(prevSectionIds);
        newSource._prevRowHash = prevRowHash;

        return newSource;
    }

    getRowData() {
        // The React.ListView calls this for *every* item during each render, which is quite
        // premature since this can be mildly expensive and memory inefficient since it keeps
        // the result of this alive through a bound renderRow function.
        return null;
    }

    getRow(sectionId, rowId) {
        // This new method is provided as a convenience for those wishing to be memory efficient.
        return this._getRowData(this._dataBlob, sectionId, rowId);
    }

    sectionHeaderShouldUpdate(sectionIndex) {
        let dirtySections = this._dirtySections;
        let dirty;

        if ((dirty = dirtySections[sectionIndex]) != null) {
            // This was already calculated before.
            return dirty;
        }

        let sectionId = this.sectionIdentities[sectionIndex];
        let sectionHeaderHasChanged = this._sectionHeaderHasChanged;
        if (this._prevSectionHash[sectionId] && sectionHeaderHasChanged) {
            dirty = sectionHeaderHasChanged(
                this._getSectionHeaderData(this._prevDataBlob, sectionId),
                this._getSectionHeaderData(this._dataBlob, sectionId)
            );
        }

        // Unless it's explicitly *not* dirty, then this section header should update.
        return (dirtySections[sectionIndex] = dirty !== false);
    }

    rowShouldUpdate(sectionIndex, rowIndex) {
        let dirtyRows = this._dirtyRows[sectionIndex];
        let dirty;

        if (!dirtyRows) {
            dirtyRows = this._dirtyRows[sectionIndex] = [];
        } else if ((dirty = dirtyRows[rowIndex]) != null) {
            // This was already calculated before.
            return dirty;
        }

        let sectionId = this.sectionIdentities[sectionIndex];
        if (this._prevSectionHash[sectionId]) {
            let rowId = this.rowIdentities[sectionIndex][rowIndex];
            if (this._prevRowHash[sectionId][rowId]) {
                let prevItem = this._getRowData(this._prevDataBlob, sectionId, rowId);
                if (prevItem) {
                    let item = this._getRowData(this._dataBlob, sectionId, rowId);
                    if (item) {
                        dirty = this._rowHasChanged(prevItem, item);
                    }
                }
            }
        }

        // Unless it's explicitly *not* dirty, then this row should update.
        return (dirtyRows[rowIndex] = dirty !== false);
    }
}

export default class ListView extends React.Component {
    constructor(props) {
        super(props);

        this.renderRow = this.renderRow.bind(this);
    }

    render() {
        return (
            <BaseListView {...this.props} ref="listView" renderRow={this.renderRow} />
        );
    }

    renderRow(_, sectionId, rowId, ...args) {
        let props = this.props;
        let item = props.dataSource.getRow(sectionId, rowId);

        // The item could be null because our data is a snapshot and it was deleted.
        return item ? props.renderRow(item, sectionId, rowId, ...args) : null;
    }

    getInnerViewNode() {
        return this.refs.listView.getInnerViewNode();
    }

    scrollTo(...args) {
        this.refs.listView.scrollTo(...args);
    }

    setNativeProps(props) {
        this.refs.listView.setNativeProps(props);
    }
}

ListView.propTypes = {
    dataSource: React.PropTypes.instanceOf(ListViewDataSource).isRequired,
    renderRow: React.PropTypes.func.isRequired,
};

ListView.DataSource = ListViewDataSource;
