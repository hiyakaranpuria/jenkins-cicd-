pipeline {
    agent any

    environment {
        APP_NAME       = 'url-shortener'
        DOCKERHUB_USER = 'hiyakaranpuria'
        IMAGE_NAME     = "${DOCKERHUB_USER}/url-shortener"
        IMAGE_TAG      = "${IMAGE_NAME}:${BUILD_NUMBER}"
        IMAGE_LATEST   = "${IMAGE_NAME}:latest"
        CONTAINER_NAME = 'url-shortener-app'
        APP_PORT       = '3000'
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
                echo "Building Docker image: ${IMAGE_TAG}"
                bat "docker build -t ${IMAGE_TAG} -t ${IMAGE_LATEST} ."
            }
        }

        stage('Push to Docker Hub') {
            steps {
                echo 'Pushing image to Docker Hub...'
                withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    bat "docker login -u %DOCKER_USER% -p %DOCKER_PASS%"
                    bat "docker push ${IMAGE_TAG}"
                    bat "docker push ${IMAGE_LATEST}"
                    bat "docker logout"
                }
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploying application...'

                // Stop and remove existing container if running (ignore errors on Windows)
                bat "docker stop ${CONTAINER_NAME} 2>nul & exit /b 0"
                bat "docker rm ${CONTAINER_NAME} 2>nul & exit /b 0"

                // Run new container
                bat "docker run -d --name ${CONTAINER_NAME} --restart unless-stopped -p ${APP_PORT}:3000 -e BASE_URL=https://yourdomain.com ${IMAGE_TAG}"

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
