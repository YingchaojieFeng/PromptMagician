ps -ef | grep "sd_server" | grep -v "grep" | awk '{print $2}' | xargs kill -9
rm nohup.out

# 0-7 correspond to the GPU ID, run a thread for each GPU
for i in 0 1 2 3 4 5 6 7
do
    nohup python -u sd_server.py $i &
done

