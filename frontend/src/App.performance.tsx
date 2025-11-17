
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, PerformanceRecord, Group, BoardPost, UserProfile, Comment, Notification, Invitation } from './types';
import { AppContext } from './context/AppContext';
import BottomNavBar from './components/BottomNavBar';
import SideNavBar from './components/SideNavBar';
import RecordView from './components/RecordView';
import CalendarView from './components/CalendarView';
import GroupsView from './components/GroupsView';
import BoardView from './components/BoardView';
import ProfileView from './components/ProfileView';
import SettingsView from './components/SettingsView';
import AuthView from './components/AuthView';
import { commonStyles } from './styles/commonStyles';

// Helper to create simple SVG avatars
const createAvatar = (name: string, color: string): string => {
    const initial = (name.split(' ').map(n => n[0]).join('') || name[0]).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="20" fill="${color}" />
        <text x="50%" y="50%" dy=".1em" dominant-baseline="central" text-anchor="middle" font-size="16" font-family="sans-serif" fill="white" font-weight="bold">${initial}</text>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const generateUserCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};


// Mock Data
const MOCK_GROUPS: Group[] = [
  { id: 'g1', name: 'Jazz Enthusiasts', owner: 'You', members: ['You', 'Miles D.', 'John C.'], uniqueId: '#JAZZ-001' },
  { id: 'g2', name: 'Classical Strings Quartet', owner: 'You', members: ['You', 'Yo-Yo Ma', 'Itzhak P.'], uniqueId: '#CLASSIC-002' },
];

const MOCK_POSTS: BoardPost[] = [
    { 
    id: 'p3', 
    title: '바흐 무반주 첼로 모음곡 1번 프렐류드 해석', 
    author: 'Yo-Yo Ma', 
    content: '바흐의 무반주 첼로 모음곡 1번 프렐류드는 많은 연주자들이 사랑하는 곡이지만, 그만큼 해석의 여지가 많은 곡이기도 합니다. 저는 이 곡을 연주할 때 각 아르페지오의 시작 음을 강조하며 큰 그림을 그리는 것에 집중합니다. 여러분은 어떤 부분에 중점을 두시나요? 자유롭게 의견을 나눠주세요.', 
    createdAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    tags: ['클래식', '첼로', '바흐', '해석'],
    likes: 35,
    likedBy: Array.from({length: 35}, (_, i) => `User${i+1}`), // Mock users
    comments: [
       { id: 'c4', author: 'Itzhak P.', content: '정말 좋은 접근법이네요. 저는 프레이징의 연결성에 대해 많이 고민합니다.', createdAt: new Date(Date.now() - 172800000).toISOString(), likes: 8, likedBy: [] },
       { id: 'c5', author: 'Clara S.', content: '항상 영감을 주시는 연주 감사합니다. 덕분에 연습할 때 새로운 관점을 갖게 되었어요!', createdAt: new Date(Date.now() - 86400000).toISOString(), likes: 12, likedBy: [] },
    ]
  },
    { 
    id: 'p1', 
    title: 'Tips for better improvisation?', 
    author: 'Sonny R.', 
    content: 'Looking for advice on how to break out of playing the same licks over and over. What are your favorite exercises? Any specific scales or patterns I should focus on for jazz improv on sax?', 
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    tags: ['재즈', '즉흥연주', '테너 색소폰'],
    likes: 12,
    likedBy: ['John C.', 'Miles D.', 'Virtuoso'],
    comments: [
      { 
        id: 'c1', 
        author: 'John C.', 
        content: 'Try focusing on motivic development. Take a small melodic idea and see how many ways you can vary it.', 
        createdAt: new Date(Date.now() - 72000000).toISOString(), 
        likes: 3, 
        likedBy: ['Miles D.', 'Sonny R.'],
        replies: [
            {
                id: 'r1',
                author: 'Sonny R.',
                content: 'That\'s a great idea, thanks John!',
                createdAt: new Date(Date.now() - 68400000).toISOString(),
                likes: 1,
                likedBy: ['John C.']
            }
        ]
      },
      { id: 'c2', author: 'Miles D.', content: 'Listen more than you play. The space between the notes is just as important.', createdAt: new Date(Date.now() - 36000000).toISOString(), likes: 5, likedBy: ['Virtuoso'] },
    ]
  },
  { 
    id: 'p2', 
    title: 'Recommended Metronome Apps', 
    author: 'Clara S.', 
    content: 'Which metronome apps do you all use? I need one with complex rhythm options for practicing Chopin etudes on the piano.', 
    createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    tags: ['초보자', '클래식', '피아노'],
    likes: 7,
    likedBy: ['Virtuoso'],
    comments: [
       { id: 'c3', author: 'Virtuoso', content: 'I really like Soundbrenner, it has great customization options!', createdAt: new Date().toISOString(), likes: 1, likedBy: ['Clara S.'] },
    ]
  },
];

const MOCK_USER_PROFILES: { [key: string]: Partial<Pick<UserProfile, 'profilePicture' | 'title'>> } = {
    'Miles D.': { profilePicture: createAvatar('MD', '#4A90E2'), title: 'Jazz Legend' },
    'John C.': { profilePicture: createAvatar('JC', '#F5A623'), title: 'Sheet of Sound' },
    'Yo-Yo Ma': { profilePicture: createAvatar('YM', '#50E3C2'), title: 'Cello Maestro' },
    'Itzhak P.': { profilePicture: createAvatar('IP', '#BD10E0') },
    'Sonny R.': { profilePicture: createAvatar('SR', '#E27D60') },
    'Clara S.': { profilePicture: createAvatar('CS', '#85DCB0') },
};

const MOCK_ALL_USERS_DATA: UserProfile[] = [
    { nickname: 'Herbie H.', instrument: '피아노', features: ['재즈'], profilePicture: createAvatar('HH', '#FF6B6B'), title: 'Chameleon', email: 'herbie@example.com', userCode: generateUserCode() },
    { nickname: 'Chick C.', instrument: '피아노', features: ['재즈', '퓨전'], profilePicture: createAvatar('CC', '#4ECDC4'), title: 'Spain', email: 'chick@example.com', userCode: generateUserCode() },
    { nickname: 'Lang Lang', instrument: '피아노', features: ['클래식'], profilePicture: createAvatar('LL', '#FFE66D'), email: 'langlang@example.com', userCode: generateUserCode() },
    ...Object.keys(MOCK_USER_PROFILES).map(name => {
        const profilePart = MOCK_USER_PROFILES[name];
        return {
            nickname: name,
            instrument: 'Various',
            features: [],
            profilePicture: profilePart?.profilePicture || null,
            email: `${name.replace(/[\s.]/g, '').toLowerCase()}@example.com`,
            title: profilePart?.title || '',
            userCode: generateUserCode()
        }
    })
];


const createInitialUserProfile = (): UserProfile => ({
    nickname: 'Virtuoso',
    instrument: '피아노',
    features: [],
    profilePicture: null,
    email: 'virtuoso@example.com',
    title: '',
    userCode: generateUserCode(),
    bookmarkedPosts: [],
    socialProvider: 'Google'
});

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.RECORD);
  const [records, setRecords] = useState<PerformanceRecord[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(createInitialUserProfile());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [dontShowNoticeToday, setDontShowNoticeToday] = useState(false);

  useEffect(() => {
    try {
      const storedAuth = localStorage.getItem('virtuoso-authenticated');
      if (storedAuth === 'true') {
        setIsAuthenticated(true);
        
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const lastSeenDate = localStorage.getItem('virtuoso-last-notice-seen-date');
        const hasNotice = true; // For demonstration, assume a notice always exists.
        
        if (hasNotice && lastSeenDate !== today) {
            setShowNoticeModal(true);
        }
      }

      const storedRecords = localStorage.getItem('virtuoso-records');
      if (storedRecords) setRecords(JSON.parse(storedRecords));
      
      const storedProfile = localStorage.getItem('virtuoso-profile');
      if (storedProfile) {
          const parsedProfile = JSON.parse(storedProfile);
          if (!parsedProfile.userCode) {
              parsedProfile.userCode = generateUserCode();
          }
          if (!parsedProfile.bookmarkedPosts) {
              parsedProfile.bookmarkedPosts = [];
          }
          setUserProfile(parsedProfile);
      }

      const storedPosts = localStorage.getItem('virtuoso-posts');
      if (storedPosts) {
        setPosts(JSON.parse(storedPosts));
      } else {
        setPosts(MOCK_POSTS);
      }
      
      const storedGroups = localStorage.getItem('virtuoso-groups');
      if (storedGroups) {
        setGroups(JSON.parse(storedGroups));
      } else {
        setGroups(MOCK_GROUPS);
      }
      
      const storedNotifications = localStorage.getItem('virtuoso-notifications');
      if (storedNotifications) setNotifications(JSON.parse(storedNotifications));
      
      const storedInvitations = localStorage.getItem('virtuoso-invitations');
      if (storedInvitations) setInvitations(JSON.parse(storedInvitations));

    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('virtuoso-records', JSON.stringify(records));
    } catch (error) {
      console.error("Failed to save records to localStorage", error);
    }
  }, [records]);
  
  useEffect(() => {
    try {
      localStorage.setItem('virtuoso-posts', JSON.stringify(posts));
    } catch (error) {
      console.error("Failed to save posts to localStorage", error);
    }
  }, [posts]);
  
  useEffect(() => {
    try {
      localStorage.setItem('virtuoso-groups', JSON.stringify(groups));
    } catch (error) {
      console.error("Failed to save groups to localStorage", error);
    }
  }, [groups]);

  useEffect(() => {
    try {
      const profileToSave = { ...userProfile };
      delete profileToSave.password; // Ensure password is not saved to localStorage
      localStorage.setItem('virtuoso-profile', JSON.stringify(profileToSave));
    } catch (error) {
      console.error("Failed to save profile to localStorage", error);
    }
  }, [userProfile]);

  useEffect(() => {
    try {
      localStorage.setItem('virtuoso-notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error("Failed to save notifications to localStorage", error);
    }
  }, [notifications]);
  
  useEffect(() => {
    try {
      localStorage.setItem('virtuoso-invitations', JSON.stringify(invitations));
    } catch (error) {
      console.error("Failed to save invitations to localStorage", error);
    }
  }, [invitations]);

  // Generate notifications
  useEffect(() => {
    if (!userProfile.nickname) return;

    const newNotifications: Notification[] = [];
    const existingNotifIds = new Set(notifications.map(n => n.id));

    posts.forEach(post => {
        if (post.isDeleted || !post.comments) return;

        // Notifications for comments on my post
        if (post.author === userProfile.nickname) {
            post.comments.forEach(comment => {
                if (comment.author !== userProfile.nickname) {
                    const notifId = `notif-comment-${comment.id}`;
                    if (!existingNotifIds.has(notifId)) {
                        newNotifications.push({
                            id: notifId,
                            postId: post.id,
                            postTitle: post.title,
                            commenter: comment.author,
                            createdAt: comment.createdAt,
                            read: false,
                            type: 'comment',
                            recipient: post.author,
                        });
                    }
                }
            });
        }
        
        // Notifications for replies to my comments
        post.comments.forEach(comment => {
            if (comment.author === userProfile.nickname && comment.replies) {
                comment.replies.forEach(reply => {
                    if (reply.author !== userProfile.nickname) {
                        const notifId = `notif-reply-${reply.id}`;
                        if (!existingNotifIds.has(notifId)) {
                           newNotifications.push({
                                id: notifId,
                                postId: post.id,
                                postTitle: post.title,
                                commenter: reply.author,
                                createdAt: reply.createdAt,
                                read: false,
                                type: 'reply',
                                recipient: comment.author,
                            });
                        }
                    }
                });
            }
        });
    });

    if (newNotifications.length > 0) {
        setNotifications(prev => [...newNotifications, ...prev].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }
  }, [posts, userProfile.nickname]); // removed notifications from dependency array to avoid loop

  const addRecord = useCallback((record: Omit<PerformanceRecord, 'id'>) => {
    setRecords(prevRecords => {
      const newRecord = { ...record, id: `rec-${Date.now()}` };
      const sortedRecords = [...prevRecords, newRecord].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return sortedRecords;
    });
  }, []);
  
  const resetRecords = useCallback(() => {
      setRecords([]);
  }, []);

  const addPost = useCallback((post: Omit<BoardPost, 'id' | 'createdAt' | 'author'>) => {
    setPosts(prevPosts => {
      const newPost: BoardPost = {
        ...post,
        id: `post-${Date.now()}`,
        author: userProfile.nickname,
        createdAt: new Date().toISOString(),
        comments: [],
        likes: 0,
        likedBy: [],
      };
      return [newPost, ...prevPosts];
    });
  }, [userProfile.nickname]);

  const updatePost = useCallback((postId: string, postData: Pick<BoardPost, 'title' | 'content' | 'tags'>) => {
    setPosts(prevPosts => {
        return prevPosts.map(p => {
            if (p.id === postId) {
                return { ...p, ...postData, updatedAt: new Date().toISOString() };
            }
            return p;
        });
    });
  }, []);

  const deletePost = useCallback((postId: string) => {
    setPosts(prevPosts => {
        return prevPosts.map(p => {
            if (p.id === postId) {
                return {
                    ...p,
                    title: '삭제된 게시물입니다.',
                    content: '사용자에 의해 삭제된 게시물입니다.',
                    tags: [],
                    comments: [],
                    isDeleted: true,
                    updatedAt: new Date().toISOString()
                };
            }
            return p;
        });
    });
  }, []);


  const addComment = useCallback((postId: string, comment: Omit<Comment, 'id' | 'createdAt' | 'author'>) => {
    setPosts(prevPosts => {
        const newPosts = [...prevPosts];
        const postIndex = newPosts.findIndex(p => p.id === postId);
        if (postIndex > -1 && !newPosts[postIndex].isDeleted) {
            const newComment: Comment = {
                ...comment,
                id: `comment-${Date.now()}`,
                author: userProfile.nickname,
                createdAt: new Date().toISOString(),
                likes: 0,
                likedBy: [],
                replies: [],
            };
            const postToUpdate = newPosts[postIndex];
            const updatedComments = [...(postToUpdate.comments || []), newComment];
            newPosts[postIndex] = { ...postToUpdate, comments: updatedComments };
        }
        return newPosts;
    });
  }, [userProfile.nickname]);

  const addReply = useCallback((postId: string, parentCommentId: string, comment: Omit<Comment, 'id' | 'createdAt' | 'author'>) => {
    setPosts(prevPosts => {
      return prevPosts.map(post => {
        if (post.id === postId && !post.isDeleted) {
          const updatedComments = (post.comments || []).map(parentComment => {
            if (parentComment.id === parentCommentId) {
              const newReply: Comment = {
                ...comment,
                id: `reply-${Date.now()}`,
                author: userProfile.nickname,
                createdAt: new Date().toISOString(),
                likes: 0,
                likedBy: [],
              };
              const updatedReplies = [...(parentComment.replies || []), newReply];
              return { ...parentComment, replies: updatedReplies };
            }
            return parentComment;
          });
          return { ...post, comments: updatedComments };
        }
        return post;
      });
    });
  }, [userProfile.nickname]);


  const togglePostLike = useCallback((postId: string) => {
    setPosts(prevPosts => prevPosts.map(post => {
      if (post.id === postId) {
        const likedBy = post.likedBy || [];
        const isLiked = likedBy.includes(userProfile.nickname);
        const newLikedBy = isLiked 
          ? likedBy.filter(name => name !== userProfile.nickname)
          : [...likedBy, userProfile.nickname];
        
        return {
          ...post,
          likedBy: newLikedBy,
          likes: newLikedBy.length,
        };
      }
      return post;
    }));
  }, [userProfile.nickname]);

  const toggleCommentLike = useCallback((postId: string, commentId: string) => {
      setPosts(prevPosts => prevPosts.map(post => {
        if (post.id === postId) {
            const updatedComments = (post.comments || []).map(comment => {
                // Check top-level comment
                if (comment.id === commentId) {
                    const likedBy = comment.likedBy || [];
                    const isLiked = likedBy.includes(userProfile.nickname);
                    const newLikedBy = isLiked
                        ? likedBy.filter(name => name !== userProfile.nickname)
                        : [...likedBy, userProfile.nickname];
                    return { ...comment, likedBy: newLikedBy, likes: newLikedBy.length };
                }
                // Check replies
                if (comment.replies) {
                    const updatedReplies = comment.replies.map(reply => {
                        if (reply.id === commentId) {
                            const likedBy = reply.likedBy || [];
                            const isLiked = likedBy.includes(userProfile.nickname);
                            const newLikedBy = isLiked
                                ? likedBy.filter(name => name !== userProfile.nickname)
                                : [...likedBy, userProfile.nickname];
                            return { ...reply, likedBy: newLikedBy, likes: newLikedBy.length };
                        }
                        return reply;
                    });
                    return { ...comment, replies: updatedReplies };
                }
                return comment;
            });
            return { ...post, comments: updatedComments };
        }
        return post;
      }));
  }, [userProfile.nickname]);

  const togglePostBookmark = useCallback((postId: string) => {
    setUserProfile(prevProfile => {
        const bookmarked = prevProfile.bookmarkedPosts || [];
        const isBookmarked = bookmarked.includes(postId);
        const newBookmarked = isBookmarked
            ? bookmarked.filter(id => id !== postId)
            : [...bookmarked, postId];
        return { ...prevProfile, bookmarkedPosts: newBookmarked };
    });
  }, []);


  const updateProfile = useCallback((profile: UserProfile) => {
    setUserProfile(profile);
  }, []);
  
  const deleteAccount = useCallback(() => {
      setRecords([]);
      setPosts(MOCK_POSTS);
      setGroups(MOCK_GROUPS);
      setUserProfile(createInitialUserProfile());
      setNotifications([]);
      setInvitations([]);
      localStorage.removeItem('virtuoso-records');
      localStorage.removeItem('virtuoso-posts');
      localStorage.removeItem('virtuoso-groups');
      localStorage.removeItem('virtuoso-profile');
      localStorage.removeItem('virtuoso-notifications');
      localStorage.removeItem('virtuoso-invitations');
      localStorage.removeItem('virtuoso-authenticated');
      localStorage.removeItem('virtuoso-last-notice-seen-date');
      setIsAuthenticated(false);
      setCurrentView(View.RECORD);
  }, []);

  const addGroup = useCallback((groupName: string) => {
    setGroups(prevGroups => {
        const newGroup: Group = {
            id: `g-${Date.now()}`,
            name: groupName,
            owner: userProfile.nickname,
            members: [userProfile.nickname],
            uniqueId: `#NEW-${String(Date.now()).slice(-4)}`
        };
        return [...prevGroups, newGroup];
    });
  }, [userProfile.nickname]);
  
  const sendGroupInvitation = useCallback((groupId: string, memberName: string) => {
      const group = groups.find(g => g.id === groupId);
      if (!group) return;

      const newInvitation: Invitation = {
        id: `inv-${Date.now()}`,
        groupId: group.id,
        groupName: group.name,
        invitedUserNickname: memberName,
        inviterNickname: userProfile.nickname,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      setInvitations(prev => [...prev, newInvitation]);

      const newNotification: Notification = {
          id: `notif-invite-${newInvitation.id}`,
          createdAt: new Date().toISOString(),
          read: false,
          recipient: memberName,
          type: 'group_invite',
          invitationId: newInvitation.id,
          groupId: group.id,
          groupName: group.name,
          inviter: userProfile.nickname,
      };
      setNotifications(prev => [newNotification, ...prev].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

  }, [groups, userProfile.nickname]);

  const acceptInvitation = useCallback((invitationId: string) => {
    const invitation = invitations.find(inv => inv.id === invitationId);
    if (!invitation || invitation.status !== 'pending') return;

    setInvitations(prev => prev.map(inv => inv.id === invitationId ? { ...inv, status: 'accepted' } : inv));
    
    setGroups(prevGroups => prevGroups.map(group => {
        if (group.id === invitation.groupId) {
            return { ...group, members: [...group.members, invitation.invitedUserNickname] };
        }
        return group;
    }));

    setNotifications(prev => prev.filter(notif => notif.invitationId !== invitationId));

  }, [invitations]);
  
  const declineInvitation = useCallback((invitationId: string) => {
    setInvitations(prev => prev.map(inv => inv.id === invitationId ? { ...inv, status: 'declined' } : inv));
    setNotifications(prev => prev.filter(notif => notif.invitationId !== invitationId));
  }, []);

  const leaveGroup = useCallback((groupId: string) => {
    setGroups(prevGroups => prevGroups.map(group => {
        if (group.id === groupId) {
            return {
                ...group,
                members: group.members.filter(m => m !== 'You' && m !== userProfile.nickname)
            };
        }
        return group;
    }));
  }, [userProfile.nickname]);
  
  const kickMember = useCallback((groupId: string, memberName: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    setGroups(prevGroups => prevGroups.map(g => {
        if (g.id === groupId) {
            return {
                ...g,
                members: g.members.filter(member => member !== memberName)
            };
        }
        return g;
    }));

    const newNotification: Notification = {
        id: `notif-kick-${groupId}-${memberName}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        read: false,
        recipient: memberName,
        type: 'group_kick',
        groupId: group.id,
        groupName: group.name,
    };
    setNotifications(prev => [newNotification, ...prev].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

  }, [groups]);

  const deleteGroup = useCallback((groupId: string) => {
    const groupToDelete = groups.find(g => g.id === groupId);
    if (!groupToDelete) return;

    const newNotifications: Notification[] = groupToDelete.members
        .filter(member => member !== userProfile.nickname)
        .map(member => ({
            id: `notif-delete-${groupId}-${member}-${Date.now()}`,
            createdAt: new Date().toISOString(),
            read: false,
            recipient: member,
            type: 'group_delete',
            groupId: groupToDelete.id,
            groupName: groupToDelete.name,
        }));
    
    setNotifications(prev => [...newNotifications, ...prev].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setGroups(prevGroups => prevGroups.filter(group => group.id !== groupId));
  }, [groups, userProfile.nickname]);

  const transferOwnership = useCallback((groupId: string, newOwnerName: string) => {
    setGroups(prevGroups => prevGroups.map(group => {
        if (group.id === groupId) {
            return { ...group, owner: newOwnerName };
        }
        return group;
    }));
  }, []);

  const markPostNotificationsAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => 
        (n.recipient === userProfile.nickname && (n.type === 'comment' || n.type === 'reply')) 
        ? { ...n, read: true } 
        : n
    ));
  }, [userProfile.nickname]);

  const markGroupNotificationsAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => 
        (n.recipient === userProfile.nickname && (n.type === 'group_invite' || n.type === 'group_kick' || n.type === 'group_delete'))
        ? { ...n, read: true } 
        : n
    ));
  }, [userProfile.nickname]);

  const login = useCallback(() => {
    localStorage.setItem('virtuoso-authenticated', 'true');
    setIsAuthenticated(true);
    
    // Check for notice on login
    const today = new Date().toISOString().split('T')[0];
    const lastSeenDate = localStorage.getItem('virtuoso-last-notice-seen-date');
    if (lastSeenDate !== today) {
        setShowNoticeModal(true);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('virtuoso-authenticated');
    setIsAuthenticated(false);
    setCurrentView(View.RECORD); // Reset to default view on logout
  }, []);
  
  const allUsers = useMemo(() => [userProfile, ...MOCK_ALL_USERS_DATA], [userProfile]);
  
  const myPostNotifications = useMemo(() => {
      return notifications.filter(n => n.recipient === userProfile.nickname && (n.type === 'comment' || n.type === 'reply'));
  }, [notifications, userProfile.nickname]);

  const myGroupNotifications = useMemo(() => {
      return notifications.filter(n => n.recipient === userProfile.nickname && (n.type === 'group_invite' || n.type === 'group_kick' || n.type === 'group_delete'));
  }, [notifications, userProfile.nickname]);

  const handleCloseNoticeModal = () => {
    if (dontShowNoticeToday) {
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem('virtuoso-last-notice-seen-date', today);
    }
    setShowNoticeModal(false);
  };

  const renderView = () => {
    switch (currentView) {
      case View.CALENDAR:
        return <CalendarView />;
      case View.GROUPS:
        return <GroupsView />;
      case View.BOARD:
        return <BoardView />;
      case View.PROFILE:
        return <ProfileView />;
      case View.SETTINGS:
        return <SettingsView />;
      case View.RECORD:
      default:
        return <RecordView />;
    }
  };
  
  if (isLoading) {
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-gray-900">
             <div className={`${commonStyles.spinner} h-12 w-12`}></div>
        </div>
    )
  }

  const contextValue = { 
    records, addRecord, resetRecords, 
    posts, addPost, updatePost, deletePost, addComment, addReply, togglePostLike, toggleCommentLike, togglePostBookmark,
    userProfile, updateProfile, deleteAccount, userProfiles: MOCK_USER_PROFILES, allUsers,
    groups, addGroup, leaveGroup, kickMember, deleteGroup, transferOwnership, sendGroupInvitation,
    acceptInvitation, declineInvitation,
    postNotifications: myPostNotifications,
    groupNotifications: myGroupNotifications,
    markPostNotificationsAsRead,
    markGroupNotificationsAsRead,
    setCurrentView,
    isAuthenticated, login, logout
  };

  return (
    <AppContext.Provider value={contextValue}>
        {showNoticeModal && (
            <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
                <div className={`${commonStyles.modalContainer} p-6 flex flex-col`}>
                    <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-300 text-center">공지사항</h3>
                    <p className="text-gray-600 dark:text-gray-300 mt-4 text-left">
                        Mysic: 연주 일기에 오신 것을 환영합니다! 당신의 모든 연습 과정을 기록하고, 동료 연주자들과 함께 성장해보세요.
                    </p>
                    <div className="w-full flex items-center mt-6">
                         <input
                            type="checkbox"
                            id="dontShowToday"
                            checked={dontShowNoticeToday}
                            onChange={(e) => setDontShowNoticeToday(e.target.checked)}
                            className="h-4 w-4 text-purple-600 bg-gray-200 dark:bg-gray-700 border-gray-400 dark:border-gray-600 rounded focus:ring-purple-500 cursor-pointer"
                        />
                        <label htmlFor="dontShowToday" className="ml-2 text-sm text-gray-500 dark:text-gray-400 cursor-pointer">
                            오늘은 더 이상 확인하지 않기
                        </label>
                    </div>
                    <div className="w-full mt-4">
                        <button
                            onClick={handleCloseNoticeModal}
                            className={`${commonStyles.buttonBase} ${commonStyles.primaryButton} py-3`}
                        >
                            닫기
                        </button>
                    </div>
                </div>
            </div>
        )}

        {isAuthenticated ? (
            <div className="h-screen w-screen flex flex-col md:flex-row font-sans">
                <SideNavBar currentView={currentView} setCurrentView={setCurrentView} />
                <main className="flex-1 overflow-y-auto pb-20 md:pb-4 md:pl-64">
                    {renderView()}
                </main>
                <BottomNavBar currentView={currentView} setCurrentView={setCurrentView} />
            </div>
        ) : (
            <AuthView />
        )}
    </AppContext.Provider>
  );
};

export default App;