import requests

agents={0:'May',1:'Birch',2:'Steven',3:'Maxie',4:'Archie',5:'Joseph'}

print(agents)

user_input = input("chat to pokemon_agents. please input agents' index and context(name_context):\n")

index_part=user_input.split('_')[0]
input_parts = user_input.split('_')[1]

# request
url = 'http://127.0.0.1:10002/chat'
headers = {'Content-Type': 'application/json'}
data = {'content': user_input, 'sender': "Brendan", 'receiver_id': 0,'receiver':'Birch'}

try:
    # send request
    response = requests.post(url, headers=headers, json=data)
    # get state code
    response.raise_for_status() 
    #get response
    response_json = response.json()
    print(response_json)
except requests.exceptions.HTTPError as http_err:
    print(f"HTTP Error: {http_err}")
except requests.exceptions.RequestException as req_err:
    print(f"Request Error: {req_err}")
except Exception as e:
    print(f"Other Error: {e}")