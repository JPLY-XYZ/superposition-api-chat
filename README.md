

# SUPERPOSITION CHAT API ARCHITECTURE

## REST Endpoints

### Auth

**Register User**
`POST /auth/register`

* **Input:** `{ email, password, publicKey }`
* **Output:** `{ message, userId, code }`

**Login**
`POST /auth/login`

* **Input:** `{ email, password }`
* **Output:** `{ token, userId }`

---

### Sync

**Synchronize Data**
`GET /sync`

* **Headers:** `Authorization: Bearer <TOKEN>`
* **Query:** `?lastSync={ISO_DATE}`
* **Output:**
```json
{
  "conversations": [],
  "messages": [],
  "messageUpdates": []
}

```



---

### Conversations

**Create Conversation**
`POST /conversations`

* **Headers:** `Authorization: Bearer <TOKEN>`
* **Input:**
```json
{
  "id": "uuid",
  "type": "DIRECT" | "GROUP",
  "name": "string?",
  "imageUrl": "string?",
  "participants": ["userId1", "userId2"]
}

```


* **Output:** `{ conversation }`

**List Conversations**
`GET /conversations`

* **Headers:** `Authorization: Bearer <TOKEN>`
* **Query:** `?lastConv={ID}` 
* **Output:** `{ conversations: [] }`

**Check Existing Direct Chat**
`POST /conversations/getExistingConversation`

* **Headers:** `Authorization: Bearer <TOKEN>`
* **Input:** `{ contactId }`
* **Output:** `{ conversation }`

---

### Users

**Get My Contact Code**
`GET /users/get_contact_code`

* **Headers:** `Authorization: Bearer <TOKEN>`
* **Output:** `{ code }`

**Search User**
`POST /users`

* **Headers:** `Authorization: Bearer <TOKEN>`
* **Input:** `{ code }` OR `{ id }`
* **Output:** `{ user }` (id, displayName, imageUrl, publicKey, code)

**Get My Profile**
`GET /users/get_me`

* **Headers:** `Authorization: Bearer <TOKEN>`
* **Output:** `{ user }`

**Update My Profile**
`PUT /users/update_me`

* **Headers:** `Authorization: Bearer <TOKEN>`
* **Input:** `{ displayName, imageUrl, publicKey }`
* **Output:** `{ user }`

---

## ⚡ WebSocket API

### 📤 Client  Server (Emitters)

**Send Message**

* **Event:** `send_message`
* **Payload:**
```json
{
  "id": "uuid",
  "conversationId": "uuid",
  "senderId": "uuid",
  "content": "string",
  "type": "text",
  "createdAt": "date"
}

```


* **Ack:** `{ success: boolean }`

**Update Message Status**

* **Event:** `message_status_update`
* **Payload:** `{ messageId, userId, status }`
* **Ack:** `{ success: boolean }`

**Mark Conversation Read**

* **Event:** `mark_conversation_as_read`
* **Payload:** `{ conversationId }`
* **Ack:** `{ success: boolean }`

**Get Online Users**

* **Event:** `get_online_users`
* **Payload:** `{}`
* **Ack:** `{ usersArray: ["userId1", "userId2"] }`

---

###  Server  Client (Listeners)

**New Message Received**

* **Event:** `new_message`
* **Payload:**
```json
{
  "id": "uuid",
  "conversationId": "uuid",
  "senderId": "uuid",
  "content": "string",
  "type": "text",
  "createdAt": "date"
}

```



**Message Status Changed**

* **Event:** `message_status_changed`
* **Payload:** `{ id, status }`

**New Conversation Created**

* **Event:** `new_conversation`
* **Payload:** `{ conversation }`

**User Status Changed**

* **Event:** `user_status_change`
* **Payload:** `{ userId, status }`

**All Online Users**

* **Event:** `all_online_users`
* **Payload:** `{ usersArray: ["userId1", "userId2"] }`