FROM node:10

# Install dependencies
ENV DEBIAN_FRONTEND noninteractive
RUN apt-get update -qq && \
    apt-get install -qq -y \
      # Allow us to open windows without a display
      xvfb \
      # Adding some dependencies (see https://github.com/electron/spectron/issues/144#issuecomment-270778659)
      # Display server dependencies
      libxtst6 \
      libxss1 \
      libgtk2.0-0 \
      # Core libraries for chromium driver
      libnss3 \
      libasound2 \
      libgconf-2-4 \
    && \
    # Clean-up to lower the image size
    apt-get clean
