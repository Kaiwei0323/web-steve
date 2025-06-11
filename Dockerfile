FROM ubuntu:22.04

# Install Python and pip
RUN apt-get update && apt-get install -y python3 python3-pip

# Set working directory to backend inside the container
WORKDIR /app/backend

# Copy all files and folders from the build context (web-steve/) into /app inside container
COPY . /app/

# Install Python dependencies inside backend folder
RUN pip3 install --no-cache-dir -r requirements.txt

# Expose port 5000 for Flask
EXPOSE 5000

# Set environment variables if you want, or pass --env-file when running
ENV PORT=5000
ENV MONGODB_URI=mongodb+srv://Inventec525:Inventec525@cluster0.fczvhro.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

# Run the app.py inside backend folder
CMD ["python3", "app.py"]
