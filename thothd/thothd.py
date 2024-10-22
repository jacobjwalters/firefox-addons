from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2 import extras

app = Flask(__name__)
CORS(app)

# PostgreSQL connection parameters
db_params = {
    'host': 'localhost',
    'database': 'semantic-search',
    'user': 'postgres',
    'password': 'postgres'
}

def get_url_count(url):
    """ Returns the count of a given URL """
    try:
        conn = psycopg2.connect(**db_params)
        cur = conn.cursor()

        cur.execute("SELECT count FROM webpages WHERE id = %s;", (url,))
        result = cur.fetchone()

        cur.close()
        conn.close()

        return result[0] if result else 0
    
    except psycopg2.Error as e:
        raise RuntimeError(f"Error getting URL count: {e}")

def increment_url_count(url):
    """ Increments the count of a given URL """
    try:
        conn = psycopg2.connect(**db_params)
        cur = conn.cursor()

        cur.execute("UPDATE webpages SET count = count + 1 WHERE id = %s;", (url,))
        conn.commit()

        cur.close()
        conn.close()

    except psycopg2.Error as e:
        raise RuntimeError(f"Error incrementing URL count: {e}")

# Increments count of already visited webpage
@app.route('/visit-webpage', methods=['POST'])
def visit_webpage():
    data = request.json
    url = data.get('url')
    
    if url:
        try:
            increment_url_count(url)
            return jsonify({'message': 'URL count incremented'}), 200

        except Exception as e:
            error_msg = f"Error incrementing URL count: {e}"
            print(error_msg)
            return jsonify({'error': f'Internal Server Error: {e}'}), 500

@app.route('/index-webpage', methods=['POST'])
def index_webpage():
    data = request.json
    r = data.get('content')
    print(r)

    if r:
        try:
            conn = psycopg2.connect(**db_params)
            cur = conn.cursor(cursor_factory=extras.RealDictCursor)

            url = r['url']
            title = r['title']
            body = r['body']
            access_time = r['access_time']
            count = str(get_url_count(url) + 1)
            embedding = r['embedding'] if 'embedding' in r else None

            if embedding:
                insert_query = "INSERT INTO webpages (id, title, url, body, access_time, count, embedding) VALUES (%s,%s,%s,%s,%s,%s, %s) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, access_time = EXCLUDED.access_time, count = EXCLUDED.count, embedding = EXCLUDED.embedding"
                cur.execute(insert_query, (url, title, url, body, access_time, count, embedding))
                
            else:
                insert_query = "INSERT INTO webpages (id, title, url, body, count, access_time) VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, access_time = EXCLUDED.access_time, count = EXCLUDED.count"
                cur.execute(insert_query, (url, title, url, body, access_time, count))
            
            conn.commit()
            cur.close()
            conn.close()

            print(f"Data inserted successfully: {url}")

            return jsonify({'message': 'Data inserted successfully'}), 200

        except psycopg2.Error as e:
            error_msg = f"Error inserting data: {e}"
            print(error_msg)
            return jsonify({'error': f'Internal Server Error: {e}'}), 500

    else:
        print("Content not provided")
        print(data)
        return jsonify({'error': 'Content not provided'}), 400




def execute_query(query, args=None):
    """ Executes the given query with optional arguments and returns the result """
    try:
        conn = psycopg2.connect(**db_params)
        cur = conn.cursor()

        if args:
            cur.execute(query, args)
        else:
            cur.execute(query)

        result = cur.fetchall()

        cur.close()
        conn.close()

        return result

    except psycopg2.Error as e:
        raise RuntimeError(f"Error executing query: {e}")

def get_specific_query(query_type):
    """ Returns a predefined query with optional arguments """
    queries = {
        'webpages': "SELECT title, url, 1 - (embedding <=> (%s::vector)) FROM webpages ORDER BY embedding <=> (%s::vector) LIMIT 25;",
    }

    return queries.get(query_type)

@app.route('/query', methods=['POST'])
def run_query():
    data = request.json
    query_type = data.get('query_type')
    embedding = data.get('embedding')

    if query_type:
        try:
            query = get_specific_query(query_type)
            if query:
                result = execute_query(query, (embedding,embedding))
                return jsonify(result), 200
            else:
                return jsonify({'error': f'Query type "{query_type}" not found'}), 400

        except Exception as e:
            error_msg = f"Error running query: {e}"
            print(error_msg)
            return jsonify({'error': f'Internal Server Error: {e}'}), 500

    else:
        return jsonify({'error': 'Query type not provided'}), 400

@app.route('/is_indexed', methods=['POST'])
def is_indexed():
    data = request.json
    url = data.get('url')

    if url:
        try:
            query = "SELECT EXISTS(SELECT 1 FROM webpages WHERE id = %s);"
            result = execute_query(query, (url,))
            count = get_url_count(url)

            print(f"  {url} indexed: {result[0]}; count: {count}")

            return jsonify({'indexed': result[0], 'count': count}), 200

        except Exception as e:
            error_msg = f"Error checking if URL is indexed: {e}"
            print(error_msg)
            return jsonify({'error': f'Internal Server Error: {e}'}), 500

    else:
        return jsonify({'error': 'URL not provided'}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5434)
