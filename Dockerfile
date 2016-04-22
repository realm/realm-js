FROM node:5

# Make debugging quicker.
RUN apt-get update && apt-get install -y gdb vim

# Add non-root user.
RUN useradd -ms /bin/bash user

# Make our workspace directory and work from there.
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Get the node_modules setup before anything else.
COPY package.json .
RUN npm install

# Copy only what we need to build.
ADD realm-core-linux-0.99.0.tar.gz core/
COPY src/ src/

# Build the Debug and Release versions of the module.
RUN cd src/node && ../../node_modules/.bin/node-gyp rebuild --debug
RUN cd src/node && ../../node_modules/.bin/node-gyp build --no-debug

# Create the necessary symlink to the Debug build.
RUN mkdir build && cd build && ln -s ../src/node/build/Debug/realm.node

# Copy everything else needed to run tests.
COPY lib/ lib/
COPY scripts/ scripts/
COPY tests/ tests/

# Switch to the non-root user.
RUN chown -R user .
USER user

# Default to running the Node tests
CMD ["node", "tests"]
