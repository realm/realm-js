FROM node:10

# Install dependencies
ENV DEBIAN_FRONTEND noninteractive
RUN apt-get update -qq && \
    apt-get install -qq -y \
      # Allow us to open windows without a display
      xvfb \
      # Adding some dependencies (see https://github.com/Googlechrome/puppeteer/issues/290#issuecomment-451471338)
      libx11-xcb1 libxrandr2 libasound2 libpangocairo-1.0-0 libatk1.0-0 libatk-bridge2.0-0 libgtk-3-0 libnss3 libxss1 \
    && \
    # Clean-up to lower the image size
    apt-get clean

# Jenkins will run this image as user 1001, let's ensure that user exists and has a home directory
RUN adduser --uid 1001 --disabled-password --gecos "" jenkins
# Install the SDK and NDK as jenkins
USER jenkins
