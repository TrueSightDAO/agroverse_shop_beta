#!/usr/bin/env python3
"""
Upload a video to YouTube using YouTube Data API v3.

Usage:
    python3 upload_video_to_youtube.py <video_file_path> [--title "Title"] [--description "Description"] [--privacy public|unlisted|private]

Example:
    python3 upload_video_to_youtube.py ../assets/videos/oscar-farm-video.mp4 --title "Oscar's Farm - Cacao Selection Process" --description "See how Oscar's team carefully selects cacao beans" --privacy public
"""

import os
import sys
import argparse
import httplib2
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError
import json

# OAuth 2.0 scopes — match youtube_batch_incoming.py / youtube_oauth_reauthorize.py
# so scripts/youtube_token.json refreshes without invalid_scope when re-used across tools.
SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.force-ssl",
]
API_SERVICE_NAME = 'youtube'
API_VERSION = 'v3'

# Credentials file path
CREDENTIALS_FILE = os.path.join(os.path.dirname(__file__), 'youtube_credentials.json')
TOKEN_FILE = os.path.join(os.path.dirname(__file__), 'youtube_token.json')


def get_authenticated_service():
    """Get authenticated YouTube service."""
    creds = None
    
    # Load existing token if available
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    
    # If no valid credentials, run OAuth flow
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CREDENTIALS_FILE):
                print(f"❌ Error: Credentials file not found at {CREDENTIALS_FILE}")
                sys.exit(1)
            
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        
        # Save credentials for next run
        with open(TOKEN_FILE, 'w') as token:
            token.write(creds.to_json())
    
    return build(API_SERVICE_NAME, API_VERSION, credentials=creds)


def upload_video(youtube, video_file, title, description, privacy='public', tags=None):
    """Upload a video to YouTube."""
    if not os.path.exists(video_file):
        print(f"❌ Error: Video file not found: {video_file}")
        return None
    
    # Video metadata
    body = {
        'snippet': {
            'title': title,
            'description': description,
            'tags': tags or [],
            'categoryId': '24'  # People & Blogs category
        },
        'status': {
            'privacyStatus': privacy,  # 'public', 'unlisted', or 'private'
            'selfDeclaredMadeForKids': False
        }
    }
    
    # Create media upload request
    media = MediaFileUpload(
        video_file,
        chunksize=-1,
        resumable=True,
        mimetype='video/mp4'
    )
    
    print(f"📤 Uploading: {os.path.basename(video_file)}")
    print(f"   Title: {title}")
    print(f"   Privacy: {privacy}")
    print(f"   File size: {os.path.getsize(video_file) / (1024*1024):.1f} MB")
    print()
    
    # Insert video
    try:
        insert_request = youtube.videos().insert(
            part=','.join(body.keys()),
            body=body,
            media_body=media
        )
        
        # Execute upload
        response = None
        while response is None:
            status, response = insert_request.next_chunk()
            if status:
                progress = int(status.progress() * 100)
                print(f"\r   Upload progress: {progress}%", end='', flush=True)
        
        print(f"\n✅ Upload complete!")
        video_id = response['id']
        video_url = f"https://www.youtube.com/watch?v={video_id}"
        print(f"   Video ID: {video_id}")
        print(f"   URL: {video_url}")
        return response
        
    except HttpError as e:
        print(f"\n❌ Error uploading video: {e}")
        error_details = json.loads(e.content.decode('utf-8'))
        print(f"   Error details: {error_details}")
        return None


def main():
    parser = argparse.ArgumentParser(description='Upload video to YouTube')
    parser.add_argument('video_file', help='Path to video file')
    parser.add_argument('--title', help='Video title', required=True)
    parser.add_argument('--description', help='Video description', default='')
    parser.add_argument('--privacy', choices=['public', 'unlisted', 'private'], 
                       default='public', help='Privacy setting (default: public)')
    parser.add_argument('--tags', nargs='+', help='Video tags (space-separated)')
    
    args = parser.parse_args()
    
    # Convert relative path to absolute if needed
    video_file = args.video_file
    if not os.path.isabs(video_file):
        video_file = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', video_file))
    
    print("🔐 Authenticating with YouTube...")
    youtube = get_authenticated_service()
    print("✅ Authenticated successfully!\n")
    
    result = upload_video(
        youtube,
        video_file,
        args.title,
        args.description,
        args.privacy,
        args.tags
    )
    
    if result:
        print(f"\n✅ Success! Video uploaded to YouTube")
        sys.exit(0)
    else:
        print(f"\n❌ Failed to upload video")
        sys.exit(1)


if __name__ == '__main__':
    main()
