pipeline {
    agent any
    environment {
        DOCKER_HOST = 'npipe:////./pipe/dockerDesktopLinuxEngine'
        PATH = "C:\\Program Files\\Docker\\Docker\\resources\\bin;${env.PATH}"
    }
    stages {
        stage('Checkout') {
            steps { checkout scm }
        }
        stage('Build Image') {
            steps { bat 'docker build -t pdgamersg/smart-water-monitor:latest .' }
        }
    }
}
