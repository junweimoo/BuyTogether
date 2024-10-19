# BuyTogether - Open Source Bill Sharing Platform

## 1. About
This is a web-based platform for debt simplification. In other words, you can use it to track the money that you and your friends spend, and see the simplest way to settle all of those debts with minimal transfers. The reason for developing this is to have a web-based platform that is open source, lightweight, and does not require an app, meaning you can simply share an invite code with your friends and start splitting bills in the browser. 

## 2. Deployment
The backend is written in Go, while the frontend is built on React and Tailwind. To deploy the backend, simply run `go build backend`. To deploy the frontend, run `npm run build` and serve on a static server of your choice, such as `serve`.