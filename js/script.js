  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
  import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp,
    query,
    orderBy,
    onSnapshot,
  } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

  const firebaseConfig = {
    // apiKey: "AIzaSyC4wOcc9eussYrzW-F1K_nYNE2PkqCJGZY",
    authDomain: "shinario-editor.firebaseapp.com",
    projectId: "shinario-editor",
    storageBucket: "shinario-editor.appspot.com",
    messagingSenderId: "169902401788",
    appId: "1:169902401788:web:bf225c6cb794efa4f04f79",
  };

  // Firebaseの初期化
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const q = query(collection(db, "chat"), orderBy("time", "asc"));

  // テキストエリアの初期の高さを設定する
  const textarea = document.getElementById("text");
  // 初期の行数を設定（この例では4行分の高さ）
  const initialHeight = 4 * parseFloat(getComputedStyle(textarea).lineHeight);

  // エンターキー押下時に改行を追加する処理
  $("#text").on("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // デフォルトのフォーム送信を防ぐ
      const cursorPos = this.selectionStart;
      const textBefore = this.value.substring(0, cursorPos);
      const textAfter = this.value.substring(cursorPos);
      this.value = textBefore + "\n" + textAfter;
      this.selectionStart = cursorPos + 1;
      this.selectionEnd = cursorPos + 1;
      resizeTextarea();
    }
  });

  // 送信ボタンクリックハンドラー
  $("#send").on("click", function () {
    const postData = {
      text: $("#text").val(),
      time: serverTimestamp(),
    };
    addDoc(collection(db, "chat"), postData)
      .then(() => {
        $("#text").val(""); // テキストエリアをクリア
        resizeTextarea(); // テキストエリアの高さを再調整
      })
      .catch((error) => {
        console.error("Error adding document: ", error);
      });
  });

  // データ取得処理
  onSnapshot(q, (querySnapshot) => {
    const documents = [];
    querySnapshot.docs.forEach(function (doc) {
      const document = {
        id: doc.id,
        data: doc.data(),
      };
      documents.push(document);
    });

    // 取得したデータのタグを作成
    const htmlElements = documents.map((document) => {
      let iconHtml = '<i class="fas fa-image"></i>'; // デフォルトのアイコン
      if (document.data.imageUrl) {
        iconHtml = `<img src="${document.data.imageUrl}" alt="Image" style="width: 20px; height: 20px;">`;
      }
      const time = document.data.time
        ? convertTimestampToDatetime(document.data.time.seconds)
        : "No time";
      return `
      <div id="o-box">
          <div id="li-box">
          <p id="time">${time}</p>
          <li id="${document.id}">
              <p>${document.data.text}</p>
          </li>
          </div>
          <img src="./image/プロフィール画像3.png" alt="プロフィール画像">
      </div>
      `;
    });

    $("#output").html(htmlElements.join(""));
    resizeTextarea(); // テキストエリアの高さを再調整
  });

  // テキストエリアの高さを調整する関数
  function resizeTextarea() {
    textarea.style.height = "auto"; // 高さを一旦自動調整
    // 高さを設定
    textarea.style.height = initialHeight + "px";
  }

  // 時刻をフォーマットする関数
  function convertTimestampToDatetime(seconds) {
    const date = new Date(seconds * 1000);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  document.addEventListener("DOMContentLoaded", function () {
    const chatImage = document.getElementById("chat-image");
    const popup = document.getElementById("popup");
    const overlay = document.getElementById("overlay");
    const minimizeButton = document.getElementById("minimize");
    const closeButton = document.getElementById("close");
    const section = document.getElementById("s-chat");

    let isDragging = false;
    let dragStartX, dragStartY;

    // ポップアップを初期状態で非表示にする
    popup.style.display = "none"; // 初期状態で非表示にする

    // ポップアップをドラッグ可能にするためのイベントリスナー
    popup.addEventListener("mousedown", function (e) {
      isDragging = true;
      dragStartX = e.clientX - popup.offsetLeft;
      dragStartY = e.clientY - popup.offsetTop;
    });

    document.addEventListener("mousemove", function (e) {
      if (isDragging) {
        const posX = e.clientX - dragStartX;
        const posY = e.clientY - dragStartY;
        popup.style.left = posX + "px";
        popup.style.top = posY + "px";
      }
    });

    document.addEventListener("mouseup", function () {
      isDragging = false;
    });

    chatImage.addEventListener("click", function () {
      popup.style.display = "block"; // ポップアップを表示する
      overlay.style.display = "block";
    });

    overlay.addEventListener("click", function () {
      popup.style.display = "none"; // ポップアップを非表示にする
      overlay.style.display = "none";
    });

    closeButton.addEventListener("click", function () {
      popup.style.display = "none"; // ポップアップを非表示にする
      overlay.style.display = "none";
    });

    minimizeButton.addEventListener("click", function () {
      if (popup.classList.contains("minimized")) {
        popup.classList.remove("minimized");
        overlay.style.display = "block";
      } else {
        popup.classList.add("minimized");
        overlay.style.display = "none";
      }
    });
  });
