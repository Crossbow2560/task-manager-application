// Outbound notification provider (email/push). Default just logs; replace with a real provider
// via setProvider({ send: async ({ to, subject, body }) => {} }).
let provider = {
  send: async ({ to, subject }) => console.log(`[notify] to=${to} subject="${subject}"`),
};

const setProvider = (p) => { provider = p; };
const send = (msg) => provider.send(msg);

module.exports = { setProvider, send };
