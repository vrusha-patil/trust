const Announcement = require("../models/Announcement");
const AnnouncementRecipient = require("../models/AnnouncementRecipient");
const Admin = require('../models/Admin');
const Trustee = require('../models/Trustee');
const BranchManager = require('../models/BranchManager');
const Accountant = require('../models/Accountant');
const DocumentAdmin = require('../models/DocumentAdmin');
const Devotee = require('../models/Devotee');
const { sendAnnouncementEmail } = require('../services/mailService');


// Management Endpoint - For Admins, Branch Managers, Trustees to see announcements they manage/created
exports.getAllAnnouncements = async (req, res) => {
  try {
    const user = req.user;
    let query = {};

    if (user.role === 'Admin') {
      // Admin sees all
    } else if (user.role === 'BranchManager') {
      // Branch Manager sees announcements they created, or announcements targeted to their branch
      query = {
        $or: [
          { createdBy: user._id },
          { audienceType: 'All Branches' },
          { targetBranches: user.branchId }
        ]
      };
    } else if (user.role === 'Trustee') {
      // Trustees with manage permission see what they created, and global ones
      query = {
        $or: [
          { createdBy: user._id },
          { audienceType: 'All Trust Members' },
          { targetRoles: user.systemRole || 'Trust Member' },
          { targetUsers: user._id }
        ]
      };
    } else {
      return res.status(403).json({ success: false, message: "Unauthorized to manage announcements" });
    }

    const announcements = await Announcement.find(query).sort({ createdAt: -1 }).lean();
    
    // Attach read counts
    const announcementIds = announcements.map(a => a._id);
    const readReceipts = await AnnouncementRecipient.find({
      announcementId: { $in: announcementIds },
      readStatus: true
    });
    
    const readCounts = {};
    readReceipts.forEach(r => {
      readCounts[r.announcementId] = (readCounts[r.announcementId] || 0) + 1;
    });

    const data = announcements.map(a => ({
      ...a,
      totalRead: readCounts[a._id] || 0
    }));
    
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createAnnouncement = async (req, res) => {
  try {
    const user = req.user;
    if (user.role === 'BranchManager') {
      req.body.audienceType = ['Specific Branches'];
      req.body.targetBranches = [user.branchId];
    }
    req.body.createdBy = user._id;
    req.body.createdByModel = user.role;
    
    const announcement = new Announcement(req.body);
    await announcement.save();
    
    let emailStatus = 'Emails not enabled.';
    if (announcement.emailIntegration) {
        try {
          const emails = new Set();
          const addEmails = (docs) => {
            docs.forEach(doc => { if (doc.email) emails.add(doc.email); });
          };

          const { audienceType = [], targetBranches = [], targetRoles = [], targetUsers = [] } = announcement;
          
          if (audienceType.includes('All Users')) {
            addEmails(await Devotee.find({ email: { $exists: true, $ne: '' } }));
            addEmails(await Trustee.find({ email: { $exists: true, $ne: '' } }));
            addEmails(await BranchManager.find({ email: { $exists: true, $ne: '' } }));
            addEmails(await Accountant.find({ email: { $exists: true, $ne: '' } }));
            addEmails(await DocumentAdmin.find({ email: { $exists: true, $ne: '' } }));
            addEmails(await Admin.find({ email: { $exists: true, $ne: '' } }));
          } else {
            if (audienceType.includes('All Devotees')) addEmails(await Devotee.find({ email: { $exists: true, $ne: '' } }));
            if (audienceType.includes('All Trust Members')) addEmails(await Trustee.find({ email: { $exists: true, $ne: '' } }));
            if (audienceType.includes('All Branches')) addEmails(await BranchManager.find({ email: { $exists: true, $ne: '' } }));
            if (targetBranches && targetBranches.length > 0) addEmails(await BranchManager.find({ branchId: { $in: targetBranches }, email: { $exists: true, $ne: '' } }));
            if (targetRoles && targetRoles.length > 0) {
              addEmails(await Trustee.find({ systemRole: { $in: targetRoles }, email: { $exists: true, $ne: '' } }));
              if (targetRoles.includes('Admin')) addEmails(await Admin.find({ email: { $exists: true, $ne: '' } }));
              if (targetRoles.includes('BranchManager')) addEmails(await BranchManager.find({ email: { $exists: true, $ne: '' } }));
              if (targetRoles.includes('Accountant')) addEmails(await Accountant.find({ email: { $exists: true, $ne: '' } }));
              if (targetRoles.includes('DocumentAdmin')) addEmails(await DocumentAdmin.find({ email: { $exists: true, $ne: '' } }));
            }
            if (targetUsers && targetUsers.length > 0) {
              addEmails(await Trustee.find({ _id: { $in: targetUsers }, email: { $exists: true, $ne: '' } }));
              addEmails(await Admin.find({ _id: { $in: targetUsers }, email: { $exists: true, $ne: '' } }));
              addEmails(await BranchManager.find({ _id: { $in: targetUsers }, email: { $exists: true, $ne: '' } }));
              addEmails(await Accountant.find({ _id: { $in: targetUsers }, email: { $exists: true, $ne: '' } }));
              addEmails(await DocumentAdmin.find({ _id: { $in: targetUsers }, email: { $exists: true, $ne: '' } }));
              addEmails(await Devotee.find({ _id: { $in: targetUsers }, email: { $exists: true, $ne: '' } }));
            }
          }

          const emailArray = Array.from(emails);
          if (emailArray.length > 0) {
            console.log(`[Announcement] Sending ${emailArray.length} emails...`);
            await sendAnnouncementEmail(emailArray, user.name || 'System Admin', announcement.title, announcement.message);
            emailStatus = 'Emails dispatched successfully.';
          }
        } catch (err) {
          console.error('[Announcement Email Error]', err);
          emailStatus = `Email sending failed: ${err.message}`;
        }
    }

    return res.status(201).json({ success: true, emailStatus, data: announcement });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });

    if (req.user.role !== 'Admin' && String(announcement.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to edit this announcement' });
    }

    Object.assign(announcement, req.body);
    await announcement.save();
    
    let emailStatus = 'Emails not enabled.';
    if (announcement.emailIntegration) {
        try {
          const emails = new Set();
          const addEmails = (docs) => {
            docs.forEach(doc => { if (doc.email) emails.add(doc.email); });
          };

          const { audienceType = [], targetBranches = [], targetRoles = [], targetUsers = [] } = announcement;
          
          if (audienceType.includes('All Users')) {
            addEmails(await Devotee.find({ email: { $exists: true, $ne: '' } }));
            addEmails(await Trustee.find({ email: { $exists: true, $ne: '' } }));
            addEmails(await BranchManager.find({ email: { $exists: true, $ne: '' } }));
            addEmails(await Accountant.find({ email: { $exists: true, $ne: '' } }));
            addEmails(await DocumentAdmin.find({ email: { $exists: true, $ne: '' } }));
            addEmails(await Admin.find({ email: { $exists: true, $ne: '' } }));
          } else {
            if (audienceType.includes('All Devotees')) addEmails(await Devotee.find({ email: { $exists: true, $ne: '' } }));
            if (audienceType.includes('All Trust Members')) addEmails(await Trustee.find({ email: { $exists: true, $ne: '' } }));
            if (audienceType.includes('All Branches')) addEmails(await BranchManager.find({ email: { $exists: true, $ne: '' } }));
            if (targetBranches && targetBranches.length > 0) addEmails(await BranchManager.find({ branchId: { $in: targetBranches }, email: { $exists: true, $ne: '' } }));
            if (targetRoles && targetRoles.length > 0) {
              addEmails(await Trustee.find({ systemRole: { $in: targetRoles }, email: { $exists: true, $ne: '' } }));
              if (targetRoles.includes('Admin')) addEmails(await Admin.find({ email: { $exists: true, $ne: '' } }));
              if (targetRoles.includes('BranchManager')) addEmails(await BranchManager.find({ email: { $exists: true, $ne: '' } }));
              if (targetRoles.includes('Accountant')) addEmails(await Accountant.find({ email: { $exists: true, $ne: '' } }));
              if (targetRoles.includes('DocumentAdmin')) addEmails(await DocumentAdmin.find({ email: { $exists: true, $ne: '' } }));
            }
            if (targetUsers && targetUsers.length > 0) {
              addEmails(await Trustee.find({ _id: { $in: targetUsers }, email: { $exists: true, $ne: '' } }));
              addEmails(await Admin.find({ _id: { $in: targetUsers }, email: { $exists: true, $ne: '' } }));
              addEmails(await BranchManager.find({ _id: { $in: targetUsers }, email: { $exists: true, $ne: '' } }));
              addEmails(await Accountant.find({ _id: { $in: targetUsers }, email: { $exists: true, $ne: '' } }));
              addEmails(await DocumentAdmin.find({ _id: { $in: targetUsers }, email: { $exists: true, $ne: '' } }));
              addEmails(await Devotee.find({ _id: { $in: targetUsers }, email: { $exists: true, $ne: '' } }));
            }
          }

          const emailArray = Array.from(emails);
          if (emailArray.length > 0) {
            console.log(`[Announcement] Sending ${emailArray.length} emails...`);
            await sendAnnouncementEmail(emailArray, req.user?.name || 'System Admin', announcement.title, announcement.message);
            emailStatus = 'Emails dispatched successfully.';
          }
        } catch (err) {
          console.error('[Announcement Email Error]', err);
          emailStatus = `Email sending failed: ${err.message}`;
        }
    }
    
    return res.status(200).json({ success: true, emailStatus, data: announcement });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ success: false, message: "Announcement not found" });

    // Permissions check
    if (req.user.role !== 'Admin' && String(announcement.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this announcement" });
    }

    await Announcement.findByIdAndDelete(req.params.id);
    await AnnouncementRecipient.deleteMany({ announcementId: req.params.id });
    
    res.status(200).json({ success: true, message: "Announcement deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// User Notifications Endpoint - For ANY user to fetch announcements they should see
exports.getMyNotifications = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });

    const conditions = [{ audienceType: 'All Users' }];

    if (user.role === 'Devotee') {
      conditions.push({ audienceType: 'All Devotees' });
    } else if (user.role === 'Trustee') {
      conditions.push({ audienceType: 'All Trust Members' });
      if (user.systemRole) {
        conditions.push({ targetRoles: user.systemRole });
      }
    } else if (user.role === 'BranchManager') {
      conditions.push({ audienceType: 'All Branches' });
      if (user.branchId) {
        conditions.push({ targetBranches: user.branchId });
      }
    } else if (user.role === 'Accountant') {
      conditions.push({ targetRoles: 'Accountant' });
    } else if (user.role === 'DocumentAdmin') {
      conditions.push({ targetRoles: 'DocumentAdmin' });
    }
    
    // Specific user targeting applies to anyone
    conditions.push({ targetUsers: user._id });

    // Find announcements matching the conditions
    const announcements = await Announcement.find({
      status: 'Published',
      $or: conditions
    }).sort({ publishDate: -1 });

    // Fetch read status for these announcements
    const announcementIds = announcements.map(a => a._id);
    const readReceipts = await AnnouncementRecipient.find({
      userId: user._id,
      announcementId: { $in: announcementIds }
    });

    const readSet = new Set();
    const dismissedSet = new Set();
    readReceipts.forEach(r => {
      if (r.readStatus) readSet.add(r.announcementId.toString());
      if (r.isDismissed) dismissedSet.add(r.announcementId.toString());
    });

    const data = announcements
      .filter(a => !dismissedSet.has(a._id.toString()))
      .map(a => {
        const annObj = a.toObject();
        annObj.isRead = readSet.has(a._id.toString());
        return annObj;
      });

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const receipt = await AnnouncementRecipient.findOneAndUpdate(
      { announcementId: id, userId: user._id },
      { readStatus: true, readTime: new Date(), deliveryStatus: 'Delivered' },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, data: receipt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.dismissNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const receipt = await AnnouncementRecipient.findOneAndUpdate(
      { announcementId: id, userId: user._id },
      { isDismissed: true },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, data: receipt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const readReceipts = await AnnouncementRecipient.find({ announcementId: id });
    const totalRead = readReceipts.filter(r => r.readStatus).length;
    res.status(200).json({ success: true, data: { totalRead, readReceipts } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
