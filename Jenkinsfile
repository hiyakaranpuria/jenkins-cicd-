pipeline {
    agent any

    environment {
        APP_NAME    = 'url-shortener'
        IMAGE_NAME  = "url-shortener:${BUILD_NUMBER}"
        CONTAINER_NAME = 'url-shortener-app'
        APP_PORT    = '3000'
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'Cloning repository...'
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                echo 'Installing dependencies...'
                bat 'npm install'
            }
        }

        stage('Test') {
            steps {
                echo 'Running tests...'
                bat 'node --test src/app.test.js'
            }
        }

        stage('Build Docker Image') {
            steps {
                echo "Building Docker image: ${IMAGE_NAME}"
                bat "docker build -t ${IMAGE_NAME} ."
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploying application...'

                // Stop and remove existing container if running (ignore errors on Windows)
                bat "docker stop ${CONTAINER_NAME} 2>nul & exit /b 0"
                bat "docker rm ${CONTAINER_NAME} 2>nul & exit /b 0"

                // Run new container
                bat "docker run -d --name ${CONTAINER_NAME} --restart unless-stopped -p ${APP_PORT}:3000 -e BASE_URL=https://yourdomain.com ${IMAGE_NAME}"

                echo "App deployed at http://localhost:${APP_PORT}"
            }
        }
    }

    post {
        success {
            echo "Pipeline completed successfully. Build #${BUILD_NUMBER} is live."
        }
        failure {
            echo "Pipeline failed at stage. Check logs above."
        }
        always {
            echo 'Cleaning up old Docker images...'
            bat "docker image prune -f 2>nul & exit /b 0"
        }
    }
}
