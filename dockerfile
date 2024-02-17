# Use an official Node runtime as a parent image
FROM node:16

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install any needed packages specified in package.json
RUN npm install

# Copy the rest of the application
COPY . .

# Build the TypeScript files
RUN npm run build

# Make ports 9090 and 9091 available to the world outside this container
EXPOSE 9090 9091

# Define environment variable
ENV NODE_ENV production
ENV PORT 9090
ENV DASHBOARD_PORT 9091

# Run reqon.js when the container launches with custom ports
# Note: Adjust the path to the built JavaScript file as necessary
CMD ["node", "bin/reqon.js", "--port=9090", "--dashboard-port=9091"]
