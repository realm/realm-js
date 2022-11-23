#!groovy
import groovy.json.JsonOutput

@Library('realm-ci') _
repoName = 'realm-js'

platforms = ['linux-x64']
nodeTestVersion = '16.13.1'
npmVersion = '8.1.2'

//Changing electron versions for testing requires upgrading the spectron dependency in tests/electron/package.json to a specific version.
//For more see https://www.npmjs.com/package/spectron
electronTestVersion = '8.4.1'

def gitTag = null
def formattedVersion = null
dependencies = null
coreDependencies = null

def skipBuild = null

def exclusivelyChanged(patterns) {
  // Checks if this is a change/pull request and if the files changed exclusively match the provided regular expression
  def regexp = patterns.join('|')
  return env.CHANGE_TARGET && sh(
    returnStatus: true,
    script: "git diff origin/$CHANGE_TARGET --name-only | grep -E --invert-match '${regexp}'"
  ) != 0
}

environment {
  GIT_COMMITTER_NAME="ci"
  GIT_COMMITTER_EMAIL="ci@realm.io"
  ELECTRON_DISABLE_SANDBOX=1
}

// == Stages

stage('check') {
  node('docker') {
    checkout([
      $class: 'GitSCM',
      branches: scm.branches,
      gitTool: 'native git',
      extensions: scm.extensions + [
        [$class: 'WipeWorkspace'],
        [$class: 'CleanCheckout'],
        [$class: 'CloneOption', depth: 1, shallow: true, noTags: false],
        [$class: 'SubmoduleOption', recursiveSubmodules: true, shallow: true, depth: 1]
      ],
      userRemoteConfigs: scm.userRemoteConfigs
    ])

    // Abort early if files didn't change outside of specific locations,
    // since these will has been migrated to GitHub actions.
    skipBuild = exclusivelyChanged(['^\\.github/', '^\\.vscode/', '^packages/', '^integration-tests/', '\\.md$'])
    if (skipBuild) {
      currentBuild.result = 'SUCCESS'
      echo 'Stopped since there were only changes to files that are uninteresting or already being tested using GitHub Actions'
      return
    }

    dependencies = readProperties file: 'dependencies.list'
    coreDependencies = readProperties file: 'vendor/realm-core/dependencies.list'
    gitTag = readGitTag()
    def gitSha = readGitSha()
    def version = getVersion()
    echo "tag: ${gitTag}"
    if (gitTag == "") {
      echo "No tag given for this build"
      setBuildName("${gitSha}")
    } else {
      if (gitTag != "v${dependencies.VERSION}") {
        echo "Git tag '${gitTag}' does not match v${dependencies.VERSION}"
      } else {
        echo "Building release: '${gitTag}'"
        setBuildName("Tag ${gitTag}")
      }
    }
    echo "version: ${version}"
    stash name: 'source', includes:'**/*', excludes:'react-native/android/src/main/jni/src/object-store/.dockerignore'

    if (['master'].contains(env.BRANCH_NAME)) {
      // If we're on master, instruct the docker image builds to push to the
      // cache registry
      env.DOCKER_PUSH = "1"
    }
  }
}

// Ensure no other stages are executed
if (skipBuild) {
  return
}

stage('build') {
    parallelExecutors = [:]
    parallelExecutors["Linux x86_64 NAPI ${nodeTestVersion}"] = buildLinux { buildCommon(nodeTestVersion, it) }
    parallel parallelExecutors
}


stage('test') {
  parallelExecutors = [:]
  parallelExecutors["Linux node ${nodeTestVersion} Release"] = testLinux("node Release ${nodeTestVersion}", null, true)
  parallelExecutors["Linux test runners ${nodeTestVersion}"] = testLinux("test-runners Release ${nodeTestVersion}")
  parallel parallelExecutors
}

// == Methods
def myNode(nodeSpec, block) {
  node(nodeSpec) {
    echo "Running job on ${env.NODE_NAME}"
    try {
      block.call()
    } finally {
      deleteDir()
    }
  }
}

def buildDockerEnv(name, extra_args='') {
  docker.withRegistry("https://${env.DOCKER_REGISTRY}", "ecr:eu-west-1:aws-ci-user") {
    sh "sh ./scripts/docker_build_wrapper.sh $name . ${extra_args}"
  }
  return docker.image(name)
}

def buildCommon(nodeVersion, platform, extraFlags='') {
  sh "./scripts/nvm-wrapper.sh ${nodeVersion} npm run jenkins-build ${extraFlags}"

  dir('prebuilds') {
    // Uncomment this when testing build changes if you want to be able to download pre-built artifacts from Jenkins.
    // archiveArtifacts("realm-*")
    stash includes: "realm-v${dependencies.VERSION}-napi-v${dependencies.NAPI_VERSION}-${platform}*.tar.gz", name: "prebuild-${platform}"
  }
}

def buildLinux(workerFunction) {
  return {
    myNode('docker') {
      unstash 'source'
      def image = buildDockerEnv('ci/realm-js:build')
      sh "bash ./scripts/utils.sh set-version ${dependencies.VERSION}"
      image.inside('-e HOME=/tmp') {
        workerFunction('linux-x64')
      }
    }
  }
}

def buildLinuxRpi(workerFunction) {
  return {
    myNode('docker') {
      unstash 'source'
      sh "bash ./scripts/utils.sh set-version ${dependencies.VERSION}"
      buildDockerEnv("ci/realm-js:rpi", '-f debian-multiarch-arm.Dockerfile').inside('-e HOME=/tmp') {
        workerFunction('linux-arm')
      }
    }
  }
}

def publish(dependencies, tag) {
  myNode('docker') {

    for (def platform in platforms) {
      unstash "prebuild-${platform}"
    }

    withAWS(credentials: 'tightdb-s3-ci', region: 'us-east-1') {
      s3Upload bucket: 'static.realm.io', path: "realm-js-prebuilds/${dependencies.VERSION}", includePathPattern: 'realm-*'
    }
  }
}


def readGitTag() {
  return sh(returnStdout: true, script: 'git describe --exact-match --tags HEAD || echo ""').readLines().last().trim()
}

def readGitSha() {
  return sh(returnStdout: true, script: 'git rev-parse --short HEAD').readLines().last().trim()
}

def getVersion() {
  def dependencies = readProperties file: 'dependencies.list'
  if (readGitTag() == "") {
    return "${dependencies.VERSION}-g${readGitSha()}"
  }
  else {
    return dependencies.VERSION
  }
}

def setBuildName(newBuildName) {
  currentBuild.displayName = "${currentBuild.displayName} - ${newBuildName}"
}

def reportStatus(target, state, String message) {
  echo "Reporting Status ${state} to GitHub: ${message}"
  if (message && message.length() > 140) {
    message = message.take(137) + '...' // GitHub API only allows for 140 characters
  }
  try {
    step([
      $class: 'GitHubCommitStatusSetter',
      contextSource: [$class: 'ManuallyEnteredCommitContextSource', context: target],
      statusResultSource: [$class: 'ConditionalStatusResultSource', results: [[
        $class: 'AnyBuildResult', message: message, state: state]]
      ],
      reposSource: [$class: 'ManuallyEnteredRepositorySource', url: 'https://github.com/realm/realm-js']
    ])
  } catch(Exception err) {
    echo "Error posting to GitHub: ${err}"
  }
}

def doInside(script, target, postStep = null) {
  try {
    reportStatus(target, 'PENDING', 'Build has started')

    retry(3) { // retry unstash up to three times to mitigate network and contention
      dir(env.WORKSPACE) {
        deleteDir()
        unstash 'source'
      }
    }
    dir('prebuilds') {
      unstash 'prebuild-darwin-x64'
    }
    wrap([$class: 'AnsiColorBuildWrapper']) {
        timeout(time: 1, unit: 'HOURS') {
          sh "bash ${script} ${target}"
        }
    }
    if (postStep) {
       postStep.call()
    }
    dir(env.WORKSPACE) {
      deleteDir() // solving realm/realm-js#734
    }
    reportStatus(target, 'SUCCESS', 'Success!')
  } catch(Exception e) {
    reportStatus(target, 'FAILURE', e.toString())
    currentBuild.rawBuild.setResult(Result.FAILURE)
    e.printStackTrace()
    throw e
  }
}

def doDockerInside(script, target, postStep = null) {
  docker.withRegistry("https://${env.DOCKER_REGISTRY}", "ecr:eu-west-1:aws-ci-user") {
    doInside(script, target, postStep)
  }
}

def testLinux(target, postStep = null, Boolean enableSync = false) {
  return {
    node('docker') {
      def reportName = "Linux ${target}"
      deleteDir()
      unstash 'source'
      def image = buildDockerEnv('ci/realm-js:build')
      sh "bash ./scripts/utils.sh set-version ${dependencies.VERSION}"

      def buildSteps = { String dockerArgs = "" ->
          image.inside("-e HOME=/tmp ${dockerArgs}") {
            withEnv(['npm_config_realm_local_prebuilds=prebuilds']) {
              if (enableSync) {
                  // check the network connection to local mongodb before continuing to compile everything
                  sh "curl http://mongodb-realm:9090"
              }
              dir('prebuilds') {
                unstash 'prebuild-linux-x64'
              }
              timeout(time: 1, unit: 'HOURS') {
                sh "scripts/test.sh ${target}"
              }
              if (postStep) {
                postStep.call()
              }
              deleteDir()
              reportStatus(reportName, 'SUCCESS', 'Success!')
            }
          }
      }

      try {
          reportStatus(reportName, 'PENDING', 'Build has started')
          if (enableSync) {
              // stitch images are auto-published every day to our CI
              // see https://github.com/realm/ci/tree/master/realm/docker/mongodb-realm
              // we refrain from using "latest" here to optimise docker pull cost due to a new image being built every day
              // if there's really a new feature you need from the latest stitch, upgrade this manually
            withRealmCloud(version: dependencies.MDBREALM_TEST_SERVER_TAG, appsToImport: [
              'auth-integration-tests': "${env.WORKSPACE}/tests/mongodb/common-tests",
              'pv-int-tests':           "${env.WORKSPACE}/tests/mongodb/pv-int-tests",
              'pv-string-tests':        "${env.WORKSPACE}/tests/mongodb/pv-string-tests",
              'pv-objectid-tests':      "${env.WORKSPACE}/tests/mongodb/pv-objectid-tests",
              'pv-uuid-tests':          "${env.WORKSPACE}/tests/mongodb/pv-uuid-tests"
              ]) { networkName ->
                buildSteps("-e MONGODB_REALM_ENDPOINT=\"http://mongodb-realm\" --network=${networkName}")
            }
          } else {
            buildSteps("")
          }
        } catch(Exception e) {
          reportStatus(reportName, 'FAILURE', e.toString())
          throw e
      }
    }
  }
}
