# Realm Web integration tests

## Running the tests

Ensure you have access to a running instance of MongoDB Realm.

To run it locally, ensure you have Docker and your Realm AWS credentials installed and run

    docker run --rm -i -t --publish 9090:9090 012067661104.dkr.ecr.eu-west-1.amazonaws.com/ci/mongodb-realm-images:test_server-0ed2349a36352666402d0fb2e8763ac67731768c-race
