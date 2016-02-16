/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */
'use strict';
import React, {
    AppRegistry,
    Component,
    StyleSheet,
    Text,
    View,
    ListView,
    TouchableHighlight
} from 'react-native';

const Store = require('react-native-store');
const SQLite = require('react-native-sqlite-storage');
const Realm = require('realm');

// Make SQLite module use Promises.
SQLite.enablePromise(true);

const TestObjectSchema = {
    name: "TestObject",
    properties: {
        int: "int",
        double: "double",
        date: "date",
        string: "string"
    }
}

const TestObjectListSchema = {
    name: "TestObjectList",
    properties: {
        list: {type: "list", objectType: "TestObject", default: undefined}
    }
}

const numTestObjects = 2000;
const numBatchTestObjects = numTestObjects * 100;
const numRepeats = 1;
const numQueryBuckets = 5;

class Tests {
    async setup(testName) {
        if (testName == 'enumeration') {
            await this.batchInsert(this.testObjects(numTestObjects));
        }
        if (testName == 'querycount' || testName == 'queryenum') {
            await this.batchInsert(this.testObjects(numBatchTestObjects));
        }
    }

    async binsertions() {
        await this.batchInsert(this.testObjects(numBatchTestObjects));
    }

    objectValues(object) {
         return Object.keys(TestObjectSchema.properties).map((prop) => object[prop])
    }

    testObjects(count) {
        let objects = [];
        for (let i = 0; i < count; i++) {
            objects.push({ int: i % numQueryBuckets, double: i, date: new Date(i), string: "" + i });
        }
        return objects;
    }
}

class RealmTests extends Tests {
    constructor() {
        super();
        this.name = 'Realm';
    }

    async setup(testName) {
        Realm.clearTestState();
        this.realm = new Realm({schema: [TestObjectSchema, TestObjectListSchema]});

        await super.setup(testName);
    }

    async insertions() {
        var realm = this.realm;
        for (var obj of this.testObjects(numTestObjects)) {
            realm.write(() => {
                realm.create("TestObject", obj);
            });
        }
    }

    async batchInsert(objects) {
        var realm = this.realm;
        realm.write(() => {
            realm.create("TestObjectList", { list: objects});
        });
    }

    async enumeration() {
        let objects = this.realm.objects('TestObject');
        let len = objects.length;
        var obj;
        for (let i = 0; i < len; i++) {
            obj = objects[i];
            obj.int;
            obj.double;
            obj.date;
            obj.string;
        }
        console.log("Enumerated " + len + " last: ", this.objectValues(obj));
    }

    async querycount() {
        let objects = this.realm.objects('TestObject', 'int = 0 and double < ' + numTestObjects / 2);
        let len = objects.length;
        console.log("length: " + len + " last: ", this.objectValues(objects[len - 1]));
    }

    async queryenum() {
        let objects = this.realm.objects('TestObject', 'int = 0 and double < ' + numTestObjects / 2);
        var obj;
        let len = objects.length;
        for (let i = 0; i < len; i++) {
            obj = objects[i];
            obj.int;
            obj.double;
            obj.date;
            obj.string;
        }        
        console.log("Enumerated " + len + " last: ", this.objectValues(obj));
    }
}

class RNStoreTests extends Tests {
    constructor() {
        super();
        this.name = "RNStore";
    }

    async setup(testName) {
        this.db = Store.model('objects');
        await this.db.destroy();

        await super.setup(testName);
    }

    async insertions() {
        for (var obj of this.testObjects(numTestObjects)) {
            await this.db.add(obj);
        }
    }

    async batchInsert(objects) {
        await this.db.multiAdd(objects);
    }

    async enumeration() {
        let objects = await this.db.find();
        let len = objects.length;
        var obj;
        for (let i = 0; i < len; i++) {
            obj = objects[i];
            obj.int;
            obj.double;
            obj.date;
            obj.string;
        }
        console.log("Enumerated " + len + " last: ", this.objectValues(obj));
    }

    async querycount() {
        let objects = await this.db.find({
            where: {
                and: [{ int: 0 }, { double: { lt: numTestObjects / 2 } }]
            },
            order: {
                age: 'ASC',
            }
        });
        let len = objects.length;
        console.log("length: " + len + " last: ", this.objectValues(objects[len - 1]));
    }

    async queryenum() {
        let objects = await this.db.find({
            where: {
                and: [{ int: 0 }, { double: { lt: numTestObjects / 2 } }]
            },
            order: {
                age: 'ASC',
            }
        });
        let len = objects.length;
        var obj;
        for (let i = 0; i < len; i++) {
            obj = objects[i];
            obj.int;
            obj.double;
            obj.date;
            obj.string;
        }
        console.log("Enumerated " + len + " last: ", this.objectValues(obj));
    }
}

class RNSqliteTests extends Tests {
    constructor() {
        super();
        this.name = "RNSqlite";
    }

    async setup(testName) {
        try {
            await SQLite.deleteDatabase('test.db');
        } catch (e) {}

        this.db = await SQLite.openDatabase("test.db", "1.0", "Test Database", 200000);

        await this.db.transaction((tx) => {
            tx.executeSql('CREATE TABLE t1 (string VARCHAR(100), int INTEGER, double REAL, date INTEGER);');
        });

        await super.setup(testName);
    }

    async insertions() {
        for (let i = 0; i < numTestObjects; i++) {
            let values = ["" + i, i % numQueryBuckets, i, new Date(i).getTime()];
            await this.db.transaction((tx) => {
                tx.executeSql('INSERT INTO t1 (string, int, double, date) VALUES (?,?,?,?);', values);
            });
        }
    }

    async batchInsert(objects) {
        await this.db.transaction((tx) => {
            for (let i = 0; i < numTestObjects; i++) {
                let values = ["" + i, i % numQueryBuckets, i, new Date(i).getTime()];
                tx.executeSql('INSERT INTO t1 (string, int, double, date) VALUES (?,?,?,?);', values);
            }
        });
    }

    async enumeration() {
        await this.db.readTransaction(async (tx) => {
            let [, results] = await tx.executeSql('SELECT * FROM t1;')
            let len = results.rows.length;
            var row;
            for (let i = 0; i < len; i++) {
                row = results.rows.item(i);
                row.int;
                row.double;
                row.string;
                new Date(row.date);
            }
            console.log("length: " + len + " last: ", this.objectValues(row));
        });
    }

    async querycount() {
        await this.db.readTransaction(async (tx) => {
            let [, results] = await tx.executeSql('SELECT * FROM t1 WHERE int = 0 AND double < ' + numTestObjects/2 + ';');            
            let len = results.rows.length;
            console.log("length: " + results.rows.length + " last: ", this.objectValues(results.rows.item(len - 1)));
        });
    }

    async queryenum() {
        await this.db.readTransaction(async (tx) => {
            let [, results] = await tx.executeSql('SELECT * FROM t1 WHERE int = 0 AND double < ' + numTestObjects/2 + ';');            
            let len = results.rows.length;
            var row;
            for (let i = 0; i < len; i++) {
                row = results.rows.item(i);
                row.int;
                row.double;
                row.string;
                new Date(row.date);
            }
            console.log("length: " + len + " last: ", this.objectValues(row));
        });
    }
}

const tests = ["insertions", "binsertions", "enumeration", "querycount", "queryenum"];
const apiTests = [new RealmTests, new RNSqliteTests, new RNStoreTests];

class ReactNativeBenchmarks extends Component {
    constructor(props) {
        super(props);

        this.state = {
            dataSource: new ListView.DataSource({
                rowHasChanged: (row1, row2) => row1 !== row2,
            }),
            running: false,
        };

        this._renderRow = this._renderRow.bind(this);
        this._runTests = this._runTests.bind(this);
    }

    render() {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>
                    ReactNative Storage Benchmarks
                </Text>
                <TouchableHighlight style={styles.button} onPress={this._runTests}>
                    <Text style={styles.buttonText}>
                        Run
                    </Text>
                </TouchableHighlight>
                <ListView contentContainerStyle={styles.list}
                    dataSource={this.state.dataSource}
                    renderRow={this._renderRow}
                />
            </View>
        );
    }

    _renderRow(rowData) {
        return (
            <Text style={styles.item}>{rowData.join('\t\t')}</Text>
        );
    }

    async _runTests() {
        if (this.state.running) {
            console.log("DISABLED");
            return;
        }

        this.setState({running: true});

        try {
            await this._runTestsAsync();
        } catch (e) {
            console.error('Error running tests:', e);
        }

        this.setState({running: false});
    }

    async _runTestsAsync() {
        var data = [apiTests.map((api) => api.name)];
        data[0].splice(0, 0, "\t\t");
        for (let test of tests) {
            data.push([test]);
            this.setState({
                dataSource: this.state.dataSource.cloneWithRows(data),
            });

            for (var apiTest of apiTests) {
                var totalTime = 0;
                console.log("Running " + apiTest.name + "." + test);
                for (var i = 0; i < numRepeats; i++) {
                    await apiTest.setup(test);

                    var startTime = Date.now();
                    await apiTest[test]();
                    var endTime = Date.now();

                    var time = endTime - startTime
                    console.log("finished in " + time);
                    totalTime += time;
                }

                data = data.slice();
                let last = data.length-1;
                data[last] = data[last].slice();
                data[last].push(totalTime / numRepeats);

                this.setState({
                    dataSource: this.state.dataSource.cloneWithRows(data),
                });      
            }
        }
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5FCFF',
    },
    title: {
        fontSize: 20,
        textAlign: 'center',
        margin: 20,
    },
    instructions: {
        textAlign: 'center',
        color: '#333333',
        marginBottom: 5,
    },
    list: {
        justifyContent: 'center',
        flexDirection: 'column',
        flexWrap: 'wrap',
    },
    button: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#CCC',
        width: 100,
        height: 40 
    },
    row: {
        flexDirection: 'row',
    },
    item: {
        textAlign: 'center',
        padding: 3,
        margin: 3,
        fontSize: 12
    }
});

module.exports = ReactNativeBenchmarks;
