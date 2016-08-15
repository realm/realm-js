FROM node:6

# Make debugging quicker.
RUN apt-get update && apt-get install -y gdb vim

# Add non-root user.
RUN useradd -ms /bin/bash user

# Make our workspace directory and work from there.
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Get the node_modules setup before anything else.
COPY package.json .

# Copy only what we need to build.
COPY scripts/ scripts/
COPY src/ src/

# Build the Debug version of the module.
RUN npm install --debug

# Copy everything else needed to run tests.
COPY lib/ lib/
COPY tests/ tests/

# Switch to the non-root user.
RUN chown -R user .
USER user

# Default to running the Node tests
CMD ["node", "tests"]
