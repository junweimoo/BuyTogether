CREATE TABLE rooms (
                       id UUID PRIMARY KEY,
                       created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
                       id UUID PRIMARY KEY,
                       name TEXT NOT NULL
);

CREATE TABLE room_users (
                        room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        PRIMARY KEY (room_id, user_id)
);

CREATE INDEX idx_room_users_room_id ON room_users(room_id);

CREATE TABLE items (
                       id UUID PRIMARY KEY,
                       room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
                       from_user_id UUID NOT NULL REFERENCES users(id),
                       to_user_id UUID NOT NULL REFERENCES users(id),
                       amount INTEGER NOT NULL,
                       content TEXT NOT NULL,
                       created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_items_from_user_id ON items(from_user_id);
CREATE INDEX idx_items_to_user_id ON items(to_user_id);
