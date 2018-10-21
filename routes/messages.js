const
  express   = require('express'),
  passport  = require('passport'),
  Logger    = require('../libs/Logger'),
  genError  = require('../utils/generateError'),
  Validator = require('jsonschema').Validator,
  router    = express.Router();

const { sequelize,db:{ Message} } = require('../Models/Models');

router.use(passport.authenticate('jwt',{ session:false }));



router.post('/get_messages',async(req,res,next) => {
  try {
    const isValidRequest = new Validator().validate(req.body,{
      type:'object',
      properties:{
        id:{ type:'number' },
      },
      additionalProperties:false,
      required:['id']
    }).valid;

    if ( !isValidRequest ) {
      return next(genError('MESSAGES_FETCH_FAILED'));
    }

    const forUserWithID = req.body.id;

    const sql = `
      SELECT *
      FROM Message
      WHERE id_sending in (?,?)
        AND id_receiving in (?,?)
        AND num_of_deletions < 2
        AND id_user_deleted <> ?
    `;

    const messages = await sequelize.query(sql,{
      replacements:[
        req.user.id_user,
        forUserWithID,
        forUserWithID,
        req.user.id_user,
        req.user.id_user
      ],
      type: sequelize.QueryTypes.SELECT
    });

    return res.json(messages);
  } catch(e) {
    Logger.log(e,'messages:get_messages');

    return next(genError('MESSAGES_FETCH_FAILED'));
  }
});



router.post('/delete_messages',async(req,res,next) => {
  try {
    await Message.update({
      num_of_deletions:sequelize.literal('num_of_deletions + 1'),
      id_user_deleted:req.user.id_user,
    },{
      where:{
        id_user_deleted:{
          [sequelize.Op.ne]:req.user.id_user
        },
        num_of_deletions:{
          [sequelize.Op.lt]:2
        },
        [sequelize.Op.or]:{
          id_receiving:req.user.id_user,
          id_sending:req.user.id_user
        }
      }
    });

    return res.json({ success:true });
  } catch(e) {
    Logger.log(e,'messages:delete_messages');

    return next(genError('MESSAGES_DELETING_FAILED'));
  }
});

module.exports = router;