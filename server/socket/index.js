import express from "express";
import http from "http";
import { Server } from "socket.io";
import getUserDetailsFromToken from "../helper/getUserDetailsFromToken.js";
import UserModel from "../model/UserModel.js";
import ConversationModel from "../model/ConversationModel.js";

import getConversations from "../helper/getConversation.js";
import Messagemodel from "../model/MessageModel.js";

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
});
//online user
const onlineUser = new Set();

io.on("connection", async (socket) => {
  console.log("connect user", socket.id);

  const token = socket.handshake?.auth?.token;

  const user = await getUserDetailsFromToken(token);
  // console.log(user);
  socket.join(user?.id?.toString());
  onlineUser.add(user?.id?.toString());

  io.emit("onlineUser", Array.from(onlineUser));

  socket.on("messagePage", async (userId) => {
    // console.log("userId", userId);
    const userDetails = await UserModel.findById(userId);
    // console.log("userdetails", userDetails);
    const payload = {
      _id: userDetails?._id,
      name: userDetails?.name,
      profile_img: userDetails?.profile_img,
      email: userDetails?.email,
      online: onlineUser?.has(userId),
    };

    socket.emit("messageUser", payload);

    //
    const getConversationmsg = await ConversationModel.findOne({
      $or: [
        { sender: user?.id, receiver: userId },
        { sender: userId, receiver: user?.id },
      ],
    })
      .populate("messages")
      .sort({ updatedAt: -1 });
    // console.log(object)
    const datamsgss =
      getConversationmsg?.messages?.length === 0
        ? []
        : getConversationmsg?.messages;
    io.to(user?.id).emit("prvMsg", datamsgss);
  });

  socket.on("NewMessage", async (data) => {
    console.log("userSendData", data);
    // search if conversation is available or not
    const coversation = await ConversationModel.findOne({
      $or: [
        { sender: data.sender, receiver: data.receiver },
        { sender: data.receiver, receiver: data.sender },
      ],
    });

    //create a convo
    if (!coversation) {
      const createConversation = await ConversationModel({
        sender: data.sender,
        receiver: data.receiver,
      });
      const conversation = await createConversation.save();

      //message
      const message = await new Messagemodel({
        text: data.text,
        imageUrl: "",
        videoUrl: "",
        msgBySender: data.sender,
      });
      const saveMessage = await message.save();

      // update conversation
      const updateConversation = await ConversationModel.updateOne(
        {
          _id: coversation?._id,
        },
        { $push: { messages: saveMessage?._id } }
      );

      const getConversationmsg = await ConversationModel.findOne({
        $or: [
          { sender: data?.sender, receiver: data?.receiver },
          { sender: data?.receiver, receiver: data?.sender },
        ],
      })
        .populate("messages")
        .sort({ updatedAt: -1 });

      console.log("sender", data.sender);
      console.log("receiver", data.receiver);

      io.to(data.receiver).emit("message", getConversationmsg.messages || []);
      io.to(data.sender).emit("message", getConversationmsg.messages || []);

      //sidebar conversations
      const coversationsSenders = await getConversations(data.sender);
      const coversationsReceivers = await getConversations(data.receiver);

      io.to(data.receiver).emit("alluserChat", coversationsReceivers);
      io.to(data.sender).emit("alluserChat", coversationsSenders);
    } else {
      //message
      const message = await new Messagemodel({
        text: data.text,
        imageUrl: "",
        videoUrl: "",
        msgBySender: data.sender,
      });
      const saveMessage = await message.save();

      // update conversation
      const updateConversation = await ConversationModel.updateOne(
        {
          _id: coversation?._id,
        },
        { $push: { messages: saveMessage?._id } }
      );

      const getConversationmsg = await ConversationModel.findOne({
        $or: [
          { sender: data?.sender, receiver: data?.receiver },
          { sender: data?.receiver, receiver: data?.sender },
        ],
      })
        .populate("messages")
        .sort({ updatedAt: -1 });

      console.log("sender", data.sender);
      console.log("receiver", data.receiver);

      io.to(data.receiver).emit("message", getConversationmsg.messages || []);
      io.to(data.sender).emit("message", getConversationmsg.messages || []);

      //sidebar conversations
      const coversationsSenders = await getConversations(data.sender);
      const coversationsReceivers = await getConversations(data.receiver);

      io.to(data.receiver).emit("alluserChat", coversationsReceivers);
      io.to(data.sender).emit("alluserChat", coversationsSenders);
    }
    // console.log("userSend Msg", data);
    // console.log("coversation", getConversationmsg);
  });

  socket.on("sidebar", async (data) => {
    console.log("sidebar", data);
    const coversationss = await getConversations(data);
    socket.emit("alluserChat", coversationss);
  });

  // msg seen logic
  socket.on("seen", async (msgByUserId) => {
    // search if conversation is available or not
    const coversation = await ConversationModel.findOne({
      $or: [
        { sender: user._id, receiver: msgByUserId },
        { sender: msgByUserId, receiver: user._id },
      ],
    });
    const conversationMessageId = coversation?.messages || [];
    const updateMessages = await Messagemodel?.updateMany(
      { _id: { $in: conversationMessageId }, msgBySender: msgByUserId },
      { $set: { seen: true } }
    );

    //sidebar conversations
    const coversationsSenders = await getConversations(user?._id?.toString());
    const coversationsReceivers = await getConversations(msgByUserId);

    io.to(user?._id?.toString()).emit("alluserChat", coversationsSenders);
    io.to(msgByUserId).emit("alluserChat", coversationsReceivers);
  });

  socket.on("disconnect", () => {
    onlineUser.delete(user?.id);
    console.log("disconnect user", socket.id);
  });
});

export { app, server };
