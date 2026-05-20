const pool = require("../db");

function mapGroupCategoryRow(row) {
  return {
    id: row.group_category_id,
    groupId: row.group_id,
    name: row.category_name,
    type: row.type,
    icon: row.icon,
    color: row.color,
    parentGroupCategoryId: row.parent_group_category_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getCategories(groupId, filters = {}) {
  const params = [groupId];
  let typeCondition = "";

  if (filters.type) {
    params.push(filters.type);
    typeCondition = `AND type = $${params.length}`;
  }

  const { rows } = await pool.query(
    `
      SELECT *
      FROM group_categories
      WHERE group_id = $1
        ${typeCondition}
      ORDER BY type ASC, category_name ASC
    `,
    params,
  );

  return rows.map(mapGroupCategoryRow);
}

async function createCategory(groupId, userId, payload) {
  const name = String(payload.name || payload.category_name || "").trim();
  const type = payload.type;
  const icon = payload.icon || null;
  const color = payload.color || null;
  const parentId =
    payload.parentGroupCategoryId || payload.parent_group_category_id || null;

  if (!name) {
    const err = new Error("Tên danh mục nhóm là bắt buộc");
    err.status = 400;
    throw err;
  }

  if (!["income", "expense"].includes(type)) {
    const err = new Error("Loại danh mục phải là income hoặc expense");
    err.status = 400;
    throw err;
  }

  const { rows } = await pool.query(
    `
      INSERT INTO group_categories (
        group_id,
        category_name,
        type,
        icon,
        color,
        parent_group_category_id,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [groupId, name, type, icon, color, parentId, userId],
  );

  return mapGroupCategoryRow(rows[0]);
}

async function updateCategory(groupId, categoryId, payload) {
  const { rows: existedRows } = await pool.query(
    `
      SELECT *
      FROM group_categories
      WHERE group_category_id = $1
        AND group_id = $2
    `,
    [categoryId, groupId],
  );

  if (existedRows.length === 0) {
    const err = new Error("Không tìm thấy danh mục nhóm");
    err.status = 404;
    throw err;
  }

  const current = existedRows[0];

  const name =
    payload.name !== undefined
      ? String(payload.name).trim()
      : payload.category_name !== undefined
        ? String(payload.category_name).trim()
        : current.category_name;

  if (!name) {
    const err = new Error("Tên danh mục không được để trống");
    err.status = 400;
    throw err;
  }

  const type = payload.type !== undefined ? payload.type : current.type;

  if (!["income", "expense"].includes(type)) {
    const err = new Error("Loại danh mục phải là income hoặc expense");
    err.status = 400;
    throw err;
  }

  const parentId =
    payload.parentGroupCategoryId !== undefined
      ? payload.parentGroupCategoryId
      : payload.parent_group_category_id !== undefined
        ? payload.parent_group_category_id
        : current.parent_group_category_id;

  const { rows } = await pool.query(
    `
      UPDATE group_categories
      SET category_name = $1,
          type = $2,
          icon = $3,
          color = $4,
          parent_group_category_id = $5,
          updated_at = now()
      WHERE group_category_id = $6
        AND group_id = $7
      RETURNING *
    `,
    [
      name,
      type,
      payload.icon !== undefined ? payload.icon : current.icon,
      payload.color !== undefined ? payload.color : current.color,
      parentId || null,
      categoryId,
      groupId,
    ],
  );

  return mapGroupCategoryRow(rows[0]);
}

async function deleteCategory(groupId, categoryId) {
  const { rows: txRows } = await pool.query(
    `
      SELECT 1
      FROM group_transactions
      WHERE group_id = $1
        AND group_category_id = $2
      LIMIT 1
    `,
    [groupId, categoryId],
  );

  if (txRows.length > 0) {
    const err = new Error(
      "Không thể xóa danh mục vì đã có giao dịch nhóm sử dụng",
    );
    err.status = 400;
    throw err;
  }

  const { rows: childRows } = await pool.query(
    `
      SELECT 1
      FROM group_categories
      WHERE parent_group_category_id = $1
      LIMIT 1
    `,
    [categoryId],
  );

  if (childRows.length > 0) {
    const err = new Error("Không thể xóa danh mục vì đang có danh mục con");
    err.status = 400;
    throw err;
  }

  const { rowCount } = await pool.query(
    `
      DELETE FROM group_categories
      WHERE group_category_id = $1
        AND group_id = $2
    `,
    [categoryId, groupId],
  );

  if (rowCount === 0) {
    const err = new Error("Không tìm thấy danh mục nhóm");
    err.status = 404;
    throw err;
  }

  return true;
}

module.exports = {
  mapGroupCategoryRow,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
