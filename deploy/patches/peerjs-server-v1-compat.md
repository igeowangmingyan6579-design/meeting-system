# peerjs-server 0.2.9 + PeerJS client v1 兼容补丁

## 问题
前端使用本地化的 `peerjs.min.js`（v1.x），与 `peerjs-server@0.2.9` 的信令协议不完全兼容：
- v1 client 会发送 `ping` 心跳消息。
- 0.2.9 server 不认识 `ping`，原代码会 `throw e` 直接崩溃或关闭 socket，导致浏览器里出现「连接断开，正在重连…」。

## 修改位置
`node_modules/peerjs-server/lib/server.js` 中 `socket.on('message', ...)` 处理函数。

## 修改内容
1. 遇到 `ping` 时回复 `pong`。
2. `pong` / `HEARTBEAT` 直接忽略。
3. 其它未知消息只记录，不再 `throw`，避免 server 崩溃。

```js
if (['LEAVE', 'CANDIDATE', 'OFFER', 'ANSWER'].indexOf(message.type) !== -1) {
    self._handleTransmission(key, {
        type: message.type,
        src: id,
        dst: message.dst,
        payload: message.payload
    });
} else if (message.type === 'ping') {
    socket.send(JSON.stringify({ type: 'pong' }));
} else if (message.type === 'pong' || message.type === 'HEARTBEAT') {
    // keepalive response/no-op
} else {
    self._log('Message unrecognized:', data);
}
```

并在外层 catch 中移除 `throw e`：
```js
} catch (e) {
    self._log('Invalid message', data);
    // Don't crash the server on unrecognized client messages (e.g. PeerJS v1 ping)
}
```

## 持久化
每次 `npm install` 后需要重新应用此补丁，或改用 `peer` 包（>=1.0.2）替代 `peerjs-server`。
