'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Post } from '@/types'

interface PostListProps {
    viewMode: 'all' | 'my-posts' | 'drama'
    currentUser: any
    refreshKey: number
    dramaSlug?: string
}

interface VoteStatus {
    [key: string]: 1 | -1 | null;
}

interface DramaColors {
    [key: string]: string;
}

export default function PostList({ viewMode, currentUser, refreshKey, dramaSlug }: PostListProps) {
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [userVotes, setUserVotes] = useState<VoteStatus>({})
    const [dramaColors, setDramaColors] = useState<DramaColors>({})
    const [editingPost, setEditingPost] = useState<Post | null>(null)
    const [editTitle, setEditTitle] = useState('')
    const [editContent, setEditContent] = useState('')

    const fetchPosts = async () => {
        try {
            let url = '/api/posts'
            if (viewMode === 'my-posts') {
                url += `?userId=${currentUser.id}`
            } else if (viewMode === 'drama' && dramaSlug) {
                url += `?dramaSlug=${dramaSlug}`
            }

            const response = await fetch(url)
            const data = await response.json()
            setPosts(data)

            // Fetch colors for each unique drama
            if (viewMode === 'all') {
                const uniqueDramas = [...new Set(data.map((post: Post) => post.dramaSlug))]
                const colors: DramaColors = {}

                await Promise.all(
                    uniqueDramas.map(async (slug) => {
                        if (slug) {
                            const colorRes = await fetch(`/api/dramas/${slug}/membership?userId=${currentUser.id}`)
                            const { color } = await colorRes.json()
                            // @ts-ignore
                            colors[slug] = color
                        }
                    })
                )

                setDramaColors(colors)
            }

            const votes: VoteStatus = {};
            data.forEach((post: Post) => {
                const userVote = post.voters?.find(voter => voter.userId === currentUser.id);
                if (userVote) {
                    votes[post._id] = userVote.vote;
                }
            });
            setUserVotes(votes);
        } catch (error) {
            console.error('Error fetching posts:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPosts()
    }, [viewMode, currentUser.id, refreshKey, dramaSlug])

    const handleEdit = (post: Post) => {
        setEditingPost(post)
        setEditTitle(post.title)
        setEditContent(post.content)
    }

    const handleCancelEdit = () => {
        setEditingPost(null)
        setEditTitle('')
        setEditContent('')
    }

    const handleSaveEdit = async (postId: string) => {
        try {
            const response = await fetch(`/api/posts/${postId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: editTitle,
                    content: editContent
                }),
            })

            if (!response.ok) throw new Error('Failed to update post')

            setEditingPost(null)
            setEditTitle('')
            setEditContent('')
            await fetchPosts()
        } catch (error) {
            console.error('Error updating post:', error)
            alert('Failed to update post')
        }
    }

    const handleDelete = async (postId: string) => {
        if (!confirm('Are you sure you want to delete this post?')) return

        try {
            const response = await fetch(`/api/posts/${postId}`, {
                method: 'DELETE',
            })

            if (!response.ok) throw new Error('Failed to delete post')
            await fetchPosts()
        } catch (error) {
            console.error('Error deleting post:', error)
            alert('Failed to delete post')
        }
    }

    const handleVote = async (e: React.MouseEvent, postId: string, vote: 1 | -1) => {
        e.preventDefault()

        try {
            const newVote = userVotes[postId] === vote ? null : vote;

            const response = await fetch('/api/posts/vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    postId,
                    userId: currentUser.id,
                    vote: newVote
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to vote')
            }

            await fetchPosts()
        } catch (error) {
            console.error('Error voting:', error)
        }
    }

    if (loading) return (
        <div className="space-y-4">
            {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-900 p-4 rounded-lg animate-pulse">
                    <div className="h-6 bg-gray-800 rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-gray-800 rounded w-1/2"></div>
                </div>
            ))}
        </div>
    )

    return (
        <div className="space-y-4">
            {posts.map((post) => (
                <article key={post._id} className="bg-gray-900 p-4 rounded-lg shadow border border-gray-800 hover:border-gray-700 transition-colors">
                    <div className="flex">
                        <div className="flex flex-col items-center mr-4">
                            <button
                                onClick={(e) => handleVote(e, post._id, 1)}
                                className={`transition-colors ${
                                    userVotes[post._id] === 1
                                        ? 'text-blue-500'
                                        : 'text-gray-400 hover:text-blue-500'
                                }`}
                            >
                                ▲
                            </button>
                            <span className={`my-1 font-bold ${
                                userVotes[post._id] === 1 ? 'text-blue-500' :
                                    userVotes[post._id] === -1 ? 'text-red-500' :
                                        'text-white'
                            }`}>
                                {post.votes}
                            </span>
                            <button
                                onClick={(e) => handleVote(e, post._id, -1)}
                                className={`transition-colors ${
                                    userVotes[post._id] === -1
                                        ? 'text-red-500'
                                        : 'text-gray-400 hover:text-red-500'
                                }`}
                            >
                                ▼
                            </button>
                        </div>

                        <div className="flex-1">
                            {editingPost?._id === post._id ? (
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white"
                                    />
                                    <textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white"
                                        rows={4}
                                    />
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => handleSaveEdit(post._id)}
                                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={handleCancelEdit}
                                            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {viewMode === 'all' && post.dramaSlug && (
                                        <Link
                                            href={`/k/${post.dramaSlug}`}
                                            style={{ color: dramaColors[post.dramaSlug] }}
                                            className="text-xs font-medium hover:opacity-80 mb-2 inline-block"
                                        >
                                            k/{post.dramaTitle}
                                        </Link>
                                    )}
                                    <Link href={`/posts/${post._id}`}>
                                        <h2 className="text-xl font-semibold text-white hover:text-blue-400">
                                            {post.title}
                                        </h2>
                                        <p className="text-gray-300 mt-2">{post.content}</p>
                                    </Link>
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="text-sm text-gray-400">
                                            Posted by u/{post.author?.username || 'Anonymous'} •{' '}
                                            {new Date(post.createdAt).toLocaleDateString()}
                                        </div>
                                        {currentUser.id === post.author?.id && (
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => handleEdit(post)}
                                                    className="text-xs text-blue-400 hover:text-blue-300"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(post._id)}
                                                    className="text-xs text-red-400 hover:text-red-300"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </article>
            ))}
            {posts.length === 0 && (
                <p className="text-center text-gray-400">No posts yet</p>
            )}
        </div>
    )
}