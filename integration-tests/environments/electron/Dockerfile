FROM node:10

# Install dependencies
ENV DEBIAN_FRONTEND noninteractive
RUN apt-get update -qq && \
    apt-get install -qq -y \
      # Allow us to open windows without a display
      xvfb \
    && \
    # Clean-up to lower the image size
    apt-get clean
