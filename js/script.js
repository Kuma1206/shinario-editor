
const apiKey = ""; // ここに自分のAPIキーを入力してください
// axiosのインポートを確認
import axios from "https://cdn.skypack.dev/axios";
import {
  getDocs,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const initialHeight = 4 * parseFloat(getComputedStyle(textarea).lineHeight);

// ChatGPTのAPI設定
const gptEndpoint = "https://api.openai.com/v1/chat/completions";


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



$("#send").on("click", function () {
  // 送信ボタンがクリックされたときの処理
  const text = $("#text").val().trim(); // テキストを取得して余分な空白をトリム

  if (!text) {
    return; // テキストが空の場合は何もしない
  }

  const postData = {
    text: text,
    time: serverTimestamp(),
  };

  addDoc(collection(db, "chat"), postData)
    .then(() => {
      $("#text").val(""); // テキストエリアをクリア
      resizeTextarea(); // テキストエリアのサイズを調整
    })
    .catch((error) => {
      console.error("ドキュメントの追加エラー: ", error);
    });

  axios
    .post(
      gptEndpoint,
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: text }],
        max_tokens: 1000,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    )
    .then((response) => {
      // APIの応答を処理する
      if (response.data.choices && response.data.choices.length > 0) {
        const aiResponse = response.data.choices[0].message.content?.trim();
        if (aiResponse) {
          const aiPostData = {
            text: aiResponse,
            time: serverTimestamp(),
            isResponse: true, // ここでAIの応答であることを示すプロパティを設定
          };

          console.log("AIの応答を保存: ", aiPostData); // デバッグ用のログ

          addDoc(collection(db, "chat"), aiPostData)
            .then(() => {
              resizeTextarea(); // テキストエリアのサイズを調整
            })
            .catch((error) => {
              console.error("AIの応答の追加エラー: ", error);
            });
        } else {
          console.error("APIの応答に`text`プロパティがありません。");
        }
      } else {
        console.error("APIの応答に`choices`配列がありません。");
      }
    })
    .catch((error) => {
      console.error("OpenAI APIの呼び出しエラー: ", error);
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

    // AIの応答かどうかをコンソールログで確認する
    // console.log(`Document ID: ${doc.id}`);
    // console.log('Document Data:', doc.data());
    // console.log('Is Response:', doc.data().isResponse ? 'AI Response' : 'User Message');
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

    // 応答かユーザーの送信かを判断して、HTMLを生成する
    if (document.data.isResponse) {
      // 応答の時のHTML
      return `
        <div class="response-box">
            <div id="img-box">
              <img src="./image/プロフィール画像3.png" alt="プロフィール画像">
            </div>
            <div id="li-box">
                <p id="time">${time}</p>
                <li id="${document.id}">
                    <p id="p-box">${document.data.text}</p>
                </li>
            </div>
        </div>
        `;
    } else {
      // 送信の時のHTML
      return `
        <div class="send-box">
            <div id="li-box">
                <p id="time">${time}</p>
                <li id="${document.id}">
                    <p>${document.data.text}</p>
                </li>
            </div>
        </div>
        `;
    }
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

// close ボタンをクリックした際の処理
closeButton.addEventListener("click", function () {
  const confirmation = confirm("履歴を削除しますがよろしいですか？"); // 確認メッセージを表示
  if (confirmation) {
    deleteChatHistory(); // チャットの履歴を削除する関数を呼び出す
  }
});

// チャットの履歴を削除する関数
function deleteChatHistory() {
  const queryRef = collection(db, "chat"); // チャットのコレクション参照を取得
  // チャットのコレクション参照から全てのドキュメントを取得
  getDocs(queryRef)
    .then((querySnapshot) => {
      // 取得した全てのドキュメントを削除
      querySnapshot.forEach((doc) => {
        deleteDoc(doc.ref);
      });
    })
    .then(() => {
      // ドキュメントの削除が完了した後、ポップアップを非表示にする
      popup.style.display = "none";
      overlay.style.display = "none";
    })
    .catch((error) => {
      console.error("チャットの履歴削除エラー:", error);
    });
}

// // ポップアップ内の表示をリセットする関数
// function resetPopup() {
//   // テキストエリアを空にする
//   textarea.value = "";
//   // 他のポップアップ内の要素をリセットする必要があれば、ここに追加する
// }

// // close ボタンをクリックした際の処理
// closeButton.addEventListener("click", function () {
//   const confirmation = confirm("履歴を削除しますがよろしいですか？"); // 確認メッセージを表示
//   if (confirmation) {
//     resetPopup(); // ポップアップ内の表示をリセットする関数を呼び出す
//     popup.style.display = "none"; // ポップアップを非表示にする
//     overlay.style.display = "none";
//   }
// });


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
