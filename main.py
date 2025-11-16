import os
from llama_index.core import SimpleDirectoryReader, Settings
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.ollama import OllamaEmbedding
from llama_index.core import VectorStoreIndex, load_index_from_storage
from llama_index.core.storage.storage_context import StorageContext

# データを保存するディレクトリ
PERSIST_DIR = "./storage"

def read_files():
    # PDFファイルを読み取るディレクトリを指定
    loader = SimpleDirectoryReader(input_dir = './data')
    documents = loader.load_data()
    
    print(f"読み込まれたドキュメントの数: {len(documents)}")
    return documents


def build_and_query_index(documents):
    print("インデックスを構築中")
    # インデックス構築
    index = VectorStoreIndex.from_documents(documents)
    print("インデックス構築が完了")

    # インデックスをディスクに保存
    index.storage_context.persist(persist_dir=PERSIST_DIR)
    print(f"インデックスを{PERSIST_DIR}に保存")

    # クエリエンジンを作成
    query_engine = index.as_query_engine()

    # 質問
    response = query_engine.query("この明細が送られている施設名は何か")
    print("\n--- RAGによる回答 ---")
    print(response)
    print("----------------------")


def load_index_and_query():
    # 保存されたインデックスをロード
    print("保存されたインデックスをロード中です...")
    storage_context = StorageContext.from_defaults(persist_dir=PERSIST_DIR)
    index = load_index_from_storage(storage_context)
    
    print("インデックスのロードが完了しました。")
    
    # クエリエンジンを作成
    query_engine = index.as_query_engine()

    # 質問
    response = query_engine.query("11月度の売上総額はいくらですか？")
    print("\n--- RAGによる回答 ---")
    print(response)
    print("----------------------")


def main():

    # 1. Ollamaモデルの定義と設定
    # nomic-embed-textはエンベディング用、llama3はLLMの例
    embed_model = OllamaEmbedding(model_name="nomic-embed-text")
    llm = Ollama(model="llama3", request_timeout=360.0) # Gemma3ではなく、より実績のあるllama3に変更しました
    
    Settings.llm = llm
    Settings.embed_model = embed_model
    
    # 2. 永続化されたインデックスの有無を確認
    if not os.path.exists(PERSIST_DIR):
        print(f"{PERSIST_DIR}が見つかりません。新規インデックスを構築します。")
        # インデックス構築
        documents = read_files()
        build_and_query_index(documents)
    else:
        print(f"{PERSIST_DIR}が見つかりました。保存されたインデックスをロードします。")
        # インデックスのロードとクエリ実行
        load_index_and_query()


if __name__=='__main__':
    main()